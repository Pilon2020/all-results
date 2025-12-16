#!/usr/bin/env python3
"""
Validate race results in MongoDB and backfill missing athlete profiles.

Usage (from repo root):
  python scripts/verify_athlete_links.py --mongo-uri "$MONGODB_URI" --db data
  python scripts/verify_athlete_links.py --dry-run

The script:
  - Checks every race result for a non-empty athleteId.
  - Ensures each referenced athlete exists in the athletes collection.
  - Creates placeholder athlete profiles for any missing athletes (unless --dry-run).
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Mapping, Tuple

try:
    from pymongo import MongoClient
except ImportError:  # pragma: no cover - dependency is optional until used
    MongoClient = None  # type: ignore[assignment]

try:
    import certifi
except ImportError:  # pragma: no cover
    certifi = None


RaceDoc = Mapping[str, Any]
RaceResult = Mapping[str, Any]
AthleteDoc = Dict[str, Any]


def age_from_age_group(age_group: str) -> int | None:
    import re

    match = re.search(r"(\d{2})-(\d{2})", age_group or "")
    if match:
        low, high = match.groups()
        return (int(low) + int(high)) // 2
    return None


def split_name(full_name: str) -> Tuple[str, str]:
    parts = (full_name or "").strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def safe_int(value: Any) -> int | None:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def normalize_date(value: Any) -> Any:
    """Keep datetimes intact; otherwise return a trimmed string."""
    if isinstance(value, datetime):
        return value
    if value is None:
        return ""
    return str(value).strip()


def date_sort_value(value: Any) -> float:
    """Sort helper that tolerates mixed datetime/str race dates."""
    if isinstance(value, datetime):
        return value.timestamp()
    if isinstance(value, str):
        text = value.strip()
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            else:
                parsed = parsed.astimezone(timezone.utc)
            return parsed.timestamp()
        except ValueError:
            pass
        import re

        match = re.search(r"(19|20)\\d{2}", text)
        if match:
            try:
                return datetime(int(match.group(0)), 1, 1, tzinfo=timezone.utc).timestamp()
            except ValueError:
                pass
    return float("-inf")


def build_recent_race_entry(race: RaceDoc, result: RaceResult) -> Dict[str, Any]:
    overall = safe_int(result.get("overall")) or 0
    gender = safe_int(result.get("gender")) or overall
    division = safe_int(result.get("division")) or gender
    finish_time = result.get("finish") or result.get("finishTime") or ""

    return {
        "raceId": race.get("raceId") or str(race.get("_id") or ""),
        "name": race.get("name") or "",
        "date": normalize_date(race.get("date")),
        "location": race.get("location") or "",
        "distance": race.get("distance") or "",
        "draftLegal": bool(race.get("draftLegal", False)),
        "finishTime": finish_time,
        "placement": f"Overall {overall}, Gender {gender}, Div {division}",
        "isPR": False,
        "eloChange": 0,
    }


def build_athlete_doc(athlete_id: str, result: RaceResult, race_entry: Dict[str, Any]) -> AthleteDoc:
    first_name, last_name = split_name(result.get("name") or "")
    age = age_from_age_group(result.get("ageGroup") or "")

    return {
        "athleteId": athlete_id,
        "firstName": first_name,
        "lastName": last_name,
        "team": None,
        "age": age if age is not None else 0,
        "eloScore": 1500,
        "country": (result.get("country") or "UNK").strip(),
        "isClaimed": False,
        "prs": {},
        "recentRaces": [race_entry],
        "createdAt": datetime.now(timezone.utc),
    }


def ensure_profiles(db, races_collection: str, athletes_collection: str, dry_run: bool, max_print: int) -> int:
    races = db[races_collection]
    athletes = db[athletes_collection]

    db_athlete_ids = {
        str(doc["athleteId"]) for doc in athletes.find({}, {"athleteId": 1}) if doc.get("athleteId")
    }

    missing_id_results: List[Tuple[str, int, str, Any]] = []
    new_profiles: Dict[str, AthleteDoc] = {}

    race_count = 0
    results_checked = 0

    projection = {
        "raceId": 1,
        "name": 1,
        "date": 1,
        "location": 1,
        "distance": 1,
        "draftLegal": 1,
        "results": 1,
    }

    for race in races.find({}, projection):
        race_count += 1
        race_id = race.get("raceId") or str(race.get("_id") or "")
        results = race.get("results") or []
        results_checked += len(results)

        for idx, result in enumerate(results):
            athlete_id = result.get("athleteId")
            name = result.get("name") or ""
            bib = result.get("bib")
            if not athlete_id:
                missing_id_results.append((race_id, idx, name, bib))
                continue

            athlete_id = str(athlete_id)
            profile = new_profiles.get(athlete_id)
            if profile:
                profile["recentRaces"].append(build_recent_race_entry(race, result))
                continue

            if athlete_id in db_athlete_ids:
                continue

            race_entry = build_recent_race_entry(race, result)
            new_profiles[athlete_id] = build_athlete_doc(athlete_id, result, race_entry)

    for profile in new_profiles.values():
        profile["recentRaces"].sort(key=lambda r: date_sort_value(r.get("date")), reverse=True)

    if new_profiles and not dry_run:
        athletes.insert_many(list(new_profiles.values()))

    print(f"Checked {race_count} races covering {results_checked} results")
    if new_profiles:
        print(f"New athlete profiles {'to create' if dry_run else 'created'}: {len(new_profiles)}")
        for athlete_id, profile in list(new_profiles.items())[:max_print]:
            sample_race = profile["recentRaces"][0]
            print(
                f"  {athlete_id} | name={profile['firstName']} {profile['lastName']} "
                f"| country={profile['country']} | sample race={sample_race['raceId']}"
            )
        if len(new_profiles) > max_print:
            print(f"  ...and {len(new_profiles) - max_print} more")

    if missing_id_results:
        print(f"\nResults missing athleteId: {len(missing_id_results)}")
        for race_id, idx, name, bib in missing_id_results[:max_print]:
            print(f"  race={race_id} | result_index={idx} | name={name} | bib={bib}")
        if len(missing_id_results) > max_print:
            print(f"  ...and {len(missing_id_results) - max_print} more")

    if not new_profiles and not missing_id_results:
        print("All race results have athleteIds with matching athlete profiles.")

    return 1 if missing_id_results else 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ensure race results reference existing athletes; backfill missing athlete profiles."
    )
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
        "--races-collection",
        default="races",
        help="Name of the races collection.",
    )
    parser.add_argument(
        "--athletes-collection",
        default="athletes",
        help="Name of the athletes collection.",
    )
    parser.add_argument(
        "--tls-ca-file",
        default=None,
        help="Path to a CA bundle for TLS (defaults to certifi bundle when available).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Report issues without writing to Mongo.")
    parser.add_argument(
        "--max-print",
        type=int,
        default=20,
        help="Maximum number of missing entries to print for each category.",
    )
    args = parser.parse_args()

    if MongoClient is None:
        print("Missing dependency: pymongo. Install with `python3 -m pip install pymongo`.", file=sys.stderr)
        return 1

    if not args.mongo_uri:
        print("Missing Mongo URI. Pass --mongo-uri or set MONGODB_URI.", file=sys.stderr)
        return 1

    tls_ca_file = args.tls_ca_file or (certifi.where() if certifi else None)
    client = MongoClient(args.mongo_uri, tlsCAFile=tls_ca_file)
    db = client[args.db]

    return ensure_profiles(db, args.races_collection, args.athletes_collection, args.dry_run, args.max_print)


if __name__ == "__main__":
    sys.exit(main())
