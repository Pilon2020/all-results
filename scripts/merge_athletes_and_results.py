#!/usr/bin/env python3
"""
Deduplicate athlete profiles and backfill athleteRaceResults documents from race results.

The script:
  1) Merges athlete profiles that share the same normalized name/country.
  2) Generates an athleteRaceResults document for every athlete appearing in each race.
  3) Verifies existing athleteRaceResults rows point at a known race/athlete.

Usage examples (from repo root):
  python scripts/merge_athletes_and_results.py --dry-run
  python scripts/merge_athletes_and_results.py --mongo-uri "$MONGODB_URI"

Options let you skip phases; see --help for details.
"""
from __future__ import annotations

import argparse
import math
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple

try:
  from pymongo import MongoClient
except ImportError:  # pragma: no cover - dependency is optional until used
  MongoClient = None  # type: ignore[assignment]

try:
  import certifi
except ImportError:  # pragma: no cover
  certifi = None


RaceDoc = Dict[str, Any]
AthleteDoc = Dict[str, Any]
RaceResult = Dict[str, Any]
AthleteRaceResult = Dict[str, Any]


def slugify(value: str) -> str:
  normalized = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower())
  normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
  return normalized or "unknown"


def safe_int(value: Any) -> Optional[int]:
  try:
    return int(float(value))
  except (TypeError, ValueError):
    return None


def safe_float(value: Any) -> Optional[float]:
  try:
    return float(value)
  except (TypeError, ValueError):
    return None


def parse_time_seconds(raw: str) -> Optional[int]:
  if not raw:
    return None
  parts = raw.split(":")
  if len(parts) == 2:
    hours = 0
    minutes, seconds = parts
  elif len(parts) == 3:
    hours, minutes, seconds = parts
  else:
    return None
  try:
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds)
  except ValueError:
    return None


def format_seconds(seconds: Optional[float]) -> str:
  if seconds is None or math.isnan(seconds):
    return "n/a"
  total_seconds = int(seconds)
  hours, remainder = divmod(total_seconds, 3600)
  minutes, secs = divmod(remainder, 60)
  return f"{hours:d}:{minutes:02d}:{secs:02d}"

def normalize_date_string(value: Any) -> str:
  if isinstance(value, datetime):
    return value.date().isoformat()
  if isinstance(value, str):
    return value.strip()
  return ""


def date_sort_value(value: Any) -> float:
  if isinstance(value, datetime):
    return value.timestamp()
  if isinstance(value, str):
    trimmed = value.strip()
    try:
      parsed = datetime.fromisoformat(trimmed)
      if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
      else:
        parsed = parsed.astimezone(timezone.utc)
      return parsed.timestamp()
    except ValueError:
      md_y = re.match(r"(\d{2})-(\d{2})-(\d{4})", trimmed)
      if md_y:
        try:
          month, day, year = (int(md_y.group(1)), int(md_y.group(2)), int(md_y.group(3)))
          return datetime(year, month, day, tzinfo=timezone.utc).timestamp()
        except ValueError:
          pass
      match = re.search(r"(19|20)\d{2}", trimmed)
      if match:
        try:
          return datetime(int(match.group(0)), 1, 1, tzinfo=timezone.utc).timestamp()
        except ValueError:
          pass
  return float("-inf")


def age_from_age_group(age_group: str) -> Optional[int]:
  match = re.search(r"(\d{2})-(\d{2})", age_group or "")
  if match:
    low, high = match.groups()
    return (int(low) + int(high)) // 2
  return None


def parse_distance_miles(distance_label: str) -> Optional[float]:
  match = re.search(r"([\d.]+)", distance_label or "")
  if not match:
    return None
  return safe_float(match.group(1))


def pace_per_mile(distance_label: str, raw_time: str) -> str:
  distance_miles = parse_distance_miles(distance_label)
  seconds = parse_time_seconds(raw_time)
  if not distance_miles or not seconds or distance_miles <= 0:
    return "n/a"
  pace_seconds = seconds / distance_miles
  minutes, secs = divmod(int(round(pace_seconds)), 60)
  return f"{minutes:d}:{secs:02d} /mi"


def speed_mph(distance_label: str, raw_time: str) -> str:
  distance_miles = parse_distance_miles(distance_label)
  seconds = parse_time_seconds(raw_time)
  if not distance_miles or not seconds or distance_miles <= 0:
    return "n/a"
  hours = seconds / 3600
  mph = distance_miles / hours if hours else 0
  return f"{mph:.1f} mph"


def build_merge_key(athlete: AthleteDoc) -> str:
  parts = [
    slugify(athlete.get("firstName", "")),
    slugify(athlete.get("lastName", "")),
    slugify(athlete.get("country", "")),
  ]
  return "|".join(parts)


def pick_primary_athlete(group: List[AthleteDoc]) -> AthleteDoc:
  claimed = [doc for doc in group if doc.get("isClaimed")]
  if claimed:
    return claimed[0]
  sorted_group = sorted(group, key=lambda doc: doc.get("eloScore", 0), reverse=True)
  return sorted_group[0]


def merge_prs(pr_sets: Iterable[Mapping[str, Any]]) -> Dict[str, Dict[str, Any]]:
  merged: Dict[str, Dict[str, Any]] = {}

  def record_score(record: Mapping[str, Any]) -> Optional[int]:
    return parse_time_seconds(str(record.get("time", "")))

  for prs in pr_sets:
    for key, record in prs.items():
      if not isinstance(record, Mapping):
        continue
      if key not in merged:
        merged[key] = dict(record)
        continue
      current = merged[key]
      current_time = record_score(current)
      incoming_time = record_score(record)
      if incoming_time is not None and (current_time is None or incoming_time < current_time):
        merged[key] = dict(record)
  return merged


def merge_recent_races(
  races: Iterable[Mapping[str, Any]], race_lookup: Mapping[str, RaceDoc]
) -> List[Dict[str, Any]]:
  by_race: Dict[str, Dict[str, Any]] = {}

  def race_key(entry: Mapping[str, Any]) -> str:
    race_id = entry.get("raceId") or ""
    if race_id:
      return race_id
    name = (entry.get("name") or "").lower()
    date = normalize_date_string(entry.get("date")).lower()
    return f"{name}__{date}"

  for race in races:
    key = race_key(race)
    normalized = dict(race)
    if not normalized.get("raceId"):
      race_id = None
      name = normalized.get("name")
      date = normalize_date_string(normalized.get("date"))
      if name and date:
        for candidate in race_lookup.values():
          candidate_date = normalize_date_string(candidate.get("date"))
          if candidate.get("name") == name and candidate_date == date:
            race_id = candidate.get("raceId")
            break
      normalized["raceId"] = race_id

    existing = by_race.get(key)
    if not existing:
      by_race[key] = normalized
      continue

    existing_time = parse_time_seconds(str(existing.get("finishTime", "")))
    incoming_time = parse_time_seconds(str(normalized.get("finishTime", "")))
    if incoming_time is not None and (existing_time is None or incoming_time < existing_time):
      by_race[key] = normalized

  combined = list(by_race.values())
  combined.sort(key=lambda r: date_sort_value(r.get("date")), reverse=True)
  return combined


def merge_athlete_group(group: List[AthleteDoc], race_lookup: Mapping[str, RaceDoc]) -> AthleteDoc:
  primary = pick_primary_athlete(group)
  merged: AthleteDoc = dict(primary)
  merged_prs = merge_prs(doc.get("prs", {}) for doc in group)
  merged_races = merge_recent_races(
    (race for doc in group for race in doc.get("recentRaces", [])),
    race_lookup,
  )

  merged["prs"] = merged_prs
  merged["recentRaces"] = merged_races
  merged["isClaimed"] = any(doc.get("isClaimed") for doc in group)

  merged["eloScore"] = max(doc.get("eloScore", 0) or 0 for doc in group)
  merged["age"] = next((doc.get("age") for doc in group if doc.get("age") is not None), merged.get("age"))
  merged["country"] = next((doc.get("country") for doc in group if doc.get("country")), merged.get("country"))
  merged["team"] = next((doc.get("team") for doc in group if doc.get("team")), merged.get("team"))
  merged["avatarUrl"] = next((doc.get("avatarUrl") for doc in group if doc.get("avatarUrl")), merged.get("avatarUrl"))

  social_links: Dict[str, str] = {}
  for doc in group:
    links = doc.get("socialLinks") or {}
    for key, value in links.items():
      if value and key not in social_links:
        social_links[key] = value
  if social_links:
    merged["socialLinks"] = social_links

  return merged


def merge_athletes(
  db, race_lookup: Mapping[str, RaceDoc], *, dry_run: bool
) -> Tuple[Dict[str, str], Dict[str, AthleteDoc]]:
  athletes = list(db["athletes"].find({}))
  alias_map: Dict[str, str] = {}
  merged_docs: Dict[str, AthleteDoc] = {doc["athleteId"]: doc for doc in athletes}

  grouped: Dict[str, List[AthleteDoc]] = defaultdict(list)
  for athlete in athletes:
    grouped[build_merge_key(athlete)].append(athlete)

  merge_actions = 0
  removed_ids: List[Any] = []
  removed_athlete_ids: List[str] = []

  for _, group in grouped.items():
    if len(group) < 2:
      continue
    merge_actions += 1
    merged_doc = merge_athlete_group(group, race_lookup)
    primary_id = merged_doc["athleteId"]

    for doc in group:
      alias_map[doc["athleteId"]] = primary_id
    merged_docs[primary_id] = merged_doc

    if dry_run:
      continue

    primary_db_id = group[0]["_id"] if group[0]["athleteId"] == primary_id else None
    for doc in group:
      if doc["athleteId"] == primary_id:
        primary_db_id = doc["_id"]
      else:
        removed_ids.append(doc["_id"])
        removed_athlete_ids.append(doc["athleteId"])

    if primary_db_id is None:
      primary_db_id = group[0]["_id"]
      new_primary_id = group[0]["athleteId"]
      for doc in group:
        alias_map[doc["athleteId"]] = new_primary_id
      merged_docs.pop(primary_id, None)
      merged_doc["athleteId"] = new_primary_id
      primary_id = new_primary_id
      merged_docs[primary_id] = merged_doc

    db["athletes"].replace_one({"_id": primary_db_id}, merged_doc, upsert=False)

  if not dry_run and removed_ids:
    db["athletes"].delete_many({"_id": {"$in": removed_ids}})
    for athlete_id in removed_athlete_ids:
      merged_docs.pop(athlete_id, None)

  print(f"Merged {merge_actions} athlete clusters; removed {len(removed_ids)} duplicate documents.")
  return alias_map, merged_docs


def build_age_group_averages(race: RaceDoc) -> Dict[str, Dict[str, Optional[float]]]:
  stats: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: defaultdict(list))

  for result in race.get("results", []):
    age_group = result.get("ageGroup") or "unknown"
    finish = parse_time_seconds(result.get("finish", ""))
    swim = parse_time_seconds(result.get("swim", ""))
    bike = parse_time_seconds(result.get("bike", ""))
    run = parse_time_seconds(result.get("run", ""))

    if finish is not None:
      stats[age_group]["finish"].append(finish)
    if swim is not None:
      stats[age_group]["swim"].append(swim)
    if bike is not None:
      stats[age_group]["bike"].append(bike)
    if run is not None:
      stats[age_group]["run"].append(run)

  averages: Dict[str, Dict[str, Optional[float]]] = {}
  for age_group, segments in stats.items():
    averages[age_group] = {
      segment: (sum(times) / len(times) if times else None) for segment, times in segments.items()
    }
  return averages


def build_comparison_block(
  athlete_times: Dict[str, Optional[int]],
  averages: Mapping[str, Optional[float]],
) -> Dict[str, Dict[str, str]]:
  def diff_str(athlete_seconds: Optional[int], avg_seconds: Optional[float]) -> str:
    if athlete_seconds is None or avg_seconds is None:
      return "n/a"
    delta = int(round(athlete_seconds - avg_seconds))
    sign = "-" if delta < 0 else "+"
    return f"{sign}{format_seconds(abs(delta))}"

  def average_str(seconds: Optional[float]) -> str:
    return format_seconds(seconds)

  return {
    "swim": {
      "athlete": format_seconds(athlete_times.get("swim")),
      "average": average_str(averages.get("swim")),
      "diff": diff_str(athlete_times.get("swim"), averages.get("swim")),
    },
    "bike": {
      "athlete": format_seconds(athlete_times.get("bike")),
      "average": average_str(averages.get("bike")),
      "diff": diff_str(athlete_times.get("bike"), averages.get("bike")),
    },
    "run": {
      "athlete": format_seconds(athlete_times.get("run")),
      "average": average_str(averages.get("run")),
      "diff": diff_str(athlete_times.get("run"), averages.get("run")),
    },
    "total": {
      "athlete": format_seconds(athlete_times.get("finish")),
      "average": average_str(averages.get("finish")),
      "diff": diff_str(athlete_times.get("finish"), averages.get("finish")),
    },
  }


def build_split_block(result: RaceResult, race: RaceDoc) -> Dict[str, List[Dict[str, str]]]:
  return {
    "swim": [
      {
        "distance": race.get("swimDistance", ""),
        "time": result.get("swim", ""),
        "pace": pace_per_mile(race.get("swimDistance", ""), result.get("swim", "")),
      }
    ],
    "bike": [
      {
        "distance": race.get("bikeDistance", ""),
        "time": result.get("bike", ""),
        "speed": speed_mph(race.get("bikeDistance", ""), result.get("bike", "")),
      }
    ],
    "run": [
      {
        "distance": race.get("runDistance", ""),
        "time": result.get("run", ""),
        "pace": pace_per_mile(race.get("runDistance", ""), result.get("run", "")),
      }
    ],
  }


def percentile(rank: Optional[int], total: Optional[int]) -> Optional[int]:
  if not rank or not total or total <= 0:
    return None
  pct = int(round((rank / total) * 100))
  return max(1, min(pct, 100))


def build_performance_block(result: RaceResult, race: RaceDoc) -> Dict[str, Any]:
  finishers = race.get("finishers") or race.get("participants")
  overall_rank = safe_int(result.get("overall")) or 0
  gender_rank = safe_int(result.get("gender")) or overall_rank
  division_rank = safe_int(result.get("division")) or gender_rank

  return {
    "overall": overall_rank,
    "gender": gender_rank,
    "division": division_rank,
    "ageGroup": result.get("ageGroup") or "",
    "bib": safe_int(result.get("bib")) or 0,
    "finishTime": result.get("finish") or "",
    "swim": {
      "time": result.get("swim") or "",
      "pace": pace_per_mile(race.get("swimDistance", ""), result.get("swim", "")),
      "rank": overall_rank,
      "percentile": percentile(overall_rank, finishers),
    },
    "t1": {
      "time": result.get("t1") or "",
      "rank": overall_rank,
    },
    "bike": {
      "time": result.get("bike") or "",
      "speed": speed_mph(race.get("bikeDistance", ""), result.get("bike", "")),
      "rank": overall_rank,
      "percentile": percentile(overall_rank, finishers),
    },
    "t2": {
      "time": result.get("t2") or "",
      "rank": overall_rank,
    },
    "run": {
      "time": result.get("run") or "",
      "pace": pace_per_mile(race.get("runDistance", ""), result.get("run", "")),
      "rank": overall_rank,
      "percentile": percentile(overall_rank, finishers),
    },
  }


def build_athlete_race_doc(
  athlete: AthleteDoc,
  race: RaceDoc,
  result: RaceResult,
  age_group_avgs: Mapping[str, Dict[str, Optional[float]]],
) -> AthleteRaceResult:
  age_group_key = result.get("ageGroup") or "unknown"
  averages = age_group_avgs.get(age_group_key, {})

  times = {
    "finish": parse_time_seconds(result.get("finish", "")),
    "swim": parse_time_seconds(result.get("swim", "")),
    "bike": parse_time_seconds(result.get("bike", "")),
    "run": parse_time_seconds(result.get("run", "")),
  }

  comparison = build_comparison_block(times, averages)
  performance = build_performance_block(result, race)
  splits = build_split_block(result, race)

  return {
    "athleteId": athlete["athleteId"],
    "raceId": race["raceId"],
    "athlete": {
      "id": athlete["athleteId"],
      "name": f"{athlete.get('firstName', '')} {athlete.get('lastName', '')}".strip(),
      "age": athlete.get("age") or age_from_age_group(result.get("ageGroup", "")) or 0,
      "country": athlete.get("country") or "UNK",
    },
    "race": {
      "id": race["raceId"],
      "name": race.get("name", ""),
      "date": race.get("date", ""),
      "location": race.get("location", ""),
      "distance": race.get("distance", ""),
    },
    "performance": performance,
    "splits": splits,
    "comparison": {"ageGroup": comparison},
    "updatedAt": datetime.now(timezone.utc),
  }


def generate_athlete_race_results(
  db,
  races: Mapping[str, RaceDoc],
  athletes: Mapping[str, AthleteDoc],
  alias_map: Mapping[str, str],
  *,
  dry_run: bool,
) -> int:
  collection = db["athleteRaceResults"]
  created = 0
  for race_id, race in races.items():
    age_group_avgs = build_age_group_averages(race)
    for result in race.get("results", []):
      raw_id = result.get("athleteId")
      canonical_id = alias_map.get(raw_id, raw_id)
      if not canonical_id:
        continue
      athlete = athletes.get(canonical_id)
      if not athlete:
        continue

      doc = build_athlete_race_doc(athlete, race, result, age_group_avgs)
      if dry_run:
        created += 1
        continue

      collection.update_one(
        {"athleteId": canonical_id, "raceId": race_id},
        {
          "$set": doc,
          "$setOnInsert": {"createdAt": datetime.now(timezone.utc)},
        },
        upsert=True,
      )
      created += 1
  print(f"Prepared {created} athleteRaceResults documents.")
  return created


def verify_existing_results(
  db, races: Mapping[str, RaceDoc], athletes: Mapping[str, AthleteDoc]
) -> List[Tuple[str, str]]:
  collection = db["athleteRaceResults"]
  problems: List[Tuple[str, str]] = []
  for doc in collection.find({}, {"raceId": 1, "race": 1, "athleteId": 1, "athlete": 1}):
    race_id = doc.get("raceId") or (doc.get("race") or {}).get("id")
    athlete_id = doc.get("athleteId") or (doc.get("athlete") or {}).get("id")

    if race_id and race_id not in races:
      problems.append((str(race_id), "missing race"))
    if athlete_id and athlete_id not in athletes:
      problems.append((str(athlete_id), "missing athlete"))
  if problems:
    print("Found potential orphaned athleteRaceResults rows:")
    for key, reason in problems:
      print(f" - {key}: {reason}")
  else:
    print("No orphaned athleteRaceResults rows detected.")
  return problems


def load_races(db) -> Dict[str, RaceDoc]:
  races = list(db["races"].find({}))
  valid: Dict[str, RaceDoc] = {}
  skipped = 0

  for race in races:
    race_id = race.get("raceId") or race.get("id") or race.get("_id")
    if not race_id and race.get("name") and race.get("date"):
      race_id = f"{slugify(race['name'])}-{normalize_date_string(race['date'])}"

    if not race_id:
      skipped += 1
      continue

    race["raceId"] = str(race_id)
    valid[race["raceId"]] = race

  if skipped:
    print(f"Skipped {skipped} race documents missing raceId.")

  return valid


def load_athletes(db) -> Dict[str, AthleteDoc]:
  athletes = list(db["athletes"].find({}))
  return {athlete["athleteId"]: athlete for athlete in athletes}


def build_mongo_client(args) -> Any:
  if MongoClient is None:
    raise SystemExit("Missing dependency: pymongo. Install with `python3 -m pip install pymongo`.")
  tls_ca_file = args.tls_ca_file or (certifi.where() if certifi else None)
  return MongoClient(args.mongo_uri, tlsCAFile=tls_ca_file)


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Merge duplicate athletes and rebuild athlete race result documents.")
  parser.add_argument(
    "--mongo-uri",
    default=os.getenv("MONGODB_URI"),
    help="Mongo connection string (defaults to env MONGODB_URI).",
  )
  parser.add_argument(
    "--db",
    default=os.getenv("MONGODB_DATA_DB", "data"),
    help="Mongo database name (defaults to env MONGODB_DATA_DB or 'data').",
  )
  parser.add_argument(
    "--tls-ca-file",
    default=None,
    help="Path to a CA bundle for TLS (defaults to certifi bundle when available).",
  )
  parser.add_argument("--dry-run", action="store_true", help="Print actions without writing to Mongo.")
  parser.add_argument("--skip-merge", action="store_true", help="Skip merging duplicate athlete profiles.")
  parser.add_argument("--skip-generate", action="store_true", help="Skip building athleteRaceResults documents.")
  parser.add_argument("--skip-verify", action="store_true", help="Skip verifying existing athleteRaceResults links.")
  return parser.parse_args()


def main() -> None:
  args = parse_args()
  if not args.mongo_uri:
    raise SystemExit("Missing Mongo URI. Pass --mongo-uri or set MONGODB_URI.")

  client = build_mongo_client(args)
  db = client[args.db]

  races = load_races(db)
  athletes = load_athletes(db)

  alias_map: Dict[str, str] = {}
  if not args.skip_merge:
    alias_map, athletes = merge_athletes(db, races, dry_run=args.dry_run)
  else:
    alias_map = {athlete_id: athlete_id for athlete_id in athletes}

  if not args.skip_generate:
    generate_athlete_race_results(db, races, athletes, alias_map, dry_run=args.dry_run)

  if not args.skip_verify:
    verify_existing_results(db, races, athletes)

  print("Done.")


if __name__ == "__main__":
  main()
