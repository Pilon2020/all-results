#!/usr/bin/env python3
"""
Ingest race CSV files under /data into the MongoDB collections used by the app.

The script builds:
- races collection documents shaped like lib/data.ts: RaceProfile
- athletes collection documents shaped like lib/data.ts: Athlete

Usage examples (from repo root):
  python scripts/ingest_races.py --dry-run
  python scripts/ingest_races.py --mongo-uri "$MONGODB_URI"

Requires pymongo: pip install pymongo
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None  # type: ignore[assignment]

try:
    import certifi
except ImportError:
    certifi = None

# Per-race metadata to fill fields that are not present in the CSV files.
EVENT_METADATA: Dict[str, Dict[str, str]] = {
    "laquinta": {
        "title": "IRONMAN 70.3 La Quinta",
        "location": "La Quinta, CA, USA",
        "distance": "Half Distance (70.3)",
        "swimDistance": "1.2 mi",
        "bikeDistance": "56 mi",
        "runDistance": "13.1 mi",
        "distanceKey": "half",
        "weather": "Unavailable",
    },
    "wisconsin": {
        "title": "IRONMAN 70.3 Wisconsin",
        "location": "Madison, WI, USA",
        "distance": "Half Distance (70.3)",
        "swimDistance": "1.2 mi",
        "bikeDistance": "56 mi",
        "runDistance": "13.1 mi",
        "distanceKey": "half",
        "weather": "Unavailable",
    },
}

PR_KEY_LOOKUP = {
    "sprint": "sprint",
    "olympic": "olympic",
    "half": "half",
    "full": "full",
    "70.3": "half",
    "140.6": "full",
}


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    return normalized or "unknown"


def build_race_date(year: str) -> datetime:
    """Create a timezone-aware date for the race (defaults to Jan 1 of the year)."""
    try:
        return datetime(int(year), 1, 1, tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def safe_int(value: Any) -> int | None:
    try:
        parsed = int(float(value))
        return parsed
    except (TypeError, ValueError):
        return None


def parse_time_seconds(raw: str) -> int | None:
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


def age_from_age_group(age_group: str) -> int | None:
    match = re.search(r"(\d{2})-(\d{2})", age_group or "")
    if match:
        low, high = match.groups()
        return (int(low) + int(high)) // 2
    return None


def split_name(full_name: str) -> Tuple[str, str]:
    parts = full_name.strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def build_athlete_id(full_name: str, country: str) -> str:
    base = slugify(full_name or "athlete")
    country_part = slugify(country or "xx")
    digest = hashlib.sha1(full_name.strip().lower().encode("utf-8")).hexdigest()[:6]
    return f"{base}-{country_part}-{digest}"


def extract_year_from_name(name: str) -> str:
    match = re.search(r"(19|20)\d{2}", name)
    if not match:
        raise ValueError(f"Could not find a year in filename '{name}'")
    return match.group(0)


def build_race_meta(event_key: str, year: str) -> Dict[str, Any]:
    meta = EVENT_METADATA.get(event_key.lower(), {})
    title = meta.get("title") or f"{event_key} Triathlon"
    race_name = f"{title} {year}"
    race_date = build_race_date(year)
    return {
        "name": race_name,
        "raceId": f"{slugify(title)}-{year}",
        "date": race_date,
        "location": meta.get("location") or event_key,
        "distance": meta.get("distance") or "Unknown distance",
        "swimDistance": meta.get("swimDistance") or "Unknown",
        "bikeDistance": meta.get("bikeDistance") or "Unknown",
        "runDistance": meta.get("runDistance") or "Unknown",
        "distanceKey": meta.get("distanceKey") or "other",
        "weather": meta.get("weather") or "Unavailable",
    }


def update_athlete(
    athletes: Dict[str, Dict[str, Any]],
    athlete_id: str,
    first_name: str,
    last_name: str,
    country: str,
    age_group: str,
    race_meta: Dict[str, Any],
    finish_time: str,
    finish_seconds: int | None,
    placement: Tuple[int, int, int],
    points: int | None,
) -> None:
    overall_rank, gender_rank, division_rank = placement
    athlete = athletes.setdefault(
        athlete_id,
        {
            "athleteId": athlete_id,
            "firstName": first_name,
            "lastName": last_name,
            "team": None,
            "age": age_from_age_group(age_group),
            "eloScore": 0,
            "country": country or "UNK",
            "isClaimed": False,
            "prs": {},
            "recentRaces": [],
            "_elo_scores": [],
        },
    )

    if athlete.get("age") is None:
        athlete["age"] = age_from_age_group(age_group)
    if not athlete.get("country"):
        athlete["country"] = country or "UNK"
    if points:
        athlete["_elo_scores"].append(points)

    race_summary = {
        "raceId": race_meta["raceId"],
        "name": race_meta["name"],
        "date": race_meta["date"],
        "location": race_meta["location"],
        "distance": race_meta["distance"],
        "finishTime": finish_time,
        "placement": f"Overall {overall_rank}, Gender {gender_rank}, Div {division_rank}",
        "isPR": False,
        "eloChange": 0,
        "_distanceKey": race_meta.get("distanceKey"),
        "_finishSec": finish_seconds,
    }
    athlete["recentRaces"].append(race_summary)


def process_race_file(csv_path: Path, athletes: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    event_key = csv_path.parent.name
    year = extract_year_from_name(csv_path.stem)
    race_meta = build_race_meta(event_key, year)

    participants = 0
    finishers = 0
    results: List[Dict[str, Any]] = []

    with csv_path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            participants += 1
            status = (row.get("Status") or "").strip().upper()
            if status == "FIN":
                finishers += 1

            finish_time = (row.get("FinishTime") or "").strip()
            finish_seconds = safe_int(row.get("FinishTimeSec")) or parse_time_seconds(finish_time)

            overall_rank = safe_int(row.get("OverallRank")) or participants
            gender_rank = safe_int(row.get("GenderRank")) or overall_rank
            division_rank = safe_int(row.get("DivRank")) or gender_rank

            country = (row.get("Country") or "UNK").strip()
            age_group = (row.get("AgeGroup") or "").strip()
            full_name = (row.get("Name") or "").strip()
            first_name, last_name = split_name(full_name)
            athlete_id = build_athlete_id(full_name, country)

            result_entry = {
                "athleteId": athlete_id,
                "name": full_name,
                "bib": safe_int(row.get("Bib")) or 0,
                "overall": overall_rank,
                "gender": gender_rank,
                "division": division_rank,
                "ageGroup": age_group,
                "country": country,
                "swim": (row.get("Swim") or "").strip(),
                "t1": (row.get("T1") or "").strip(),
                "bike": (row.get("Bike") or "").strip(),
                "t2": (row.get("T2") or "").strip(),
                "run": (row.get("Run") or "").strip(),
                "finish": finish_time,
            }
            results.append(result_entry)

            update_athlete(
                athletes,
                athlete_id=athlete_id,
                first_name=first_name,
                last_name=last_name,
                country=country,
                age_group=age_group,
                race_meta=race_meta,
                finish_time=finish_time,
                finish_seconds=finish_seconds,
                placement=(overall_rank, gender_rank, division_rank),
                points=safe_int(row.get("Points")),
            )

    results.sort(key=lambda entry: entry.get("overall") or 0)

    return {
        "raceId": race_meta["raceId"],
        "name": race_meta["name"],
        "date": race_meta["date"],
        "location": race_meta["location"],
        "distance": race_meta["distance"],
        "participants": participants,
        "finishers": finishers,
        "weather": race_meta["weather"],
        "swimDistance": race_meta["swimDistance"],
        "bikeDistance": race_meta["bikeDistance"],
        "runDistance": race_meta["runDistance"],
        "results": results,
    }


def finalize_athletes(athletes: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    finalized: List[Dict[str, Any]] = []
    for athlete in athletes.values():
        distance_best: Dict[str, Tuple[int, Dict[str, Any]]] = {}
        for race in athlete["recentRaces"]:
            finish_sec = race.pop("_finishSec", None)
            distance_key = race.pop("_distanceKey", None)
            if distance_key and finish_sec is not None:
                current_best = distance_best.get(distance_key)
                if current_best is None or finish_sec < current_best[0]:
                    distance_best[distance_key] = (finish_sec, race)

        for distance_key, (_, race_ref) in distance_best.items():
            race_ref["isPR"] = True
            prs_key = (
                PR_KEY_LOOKUP.get(distance_key)
                or PR_KEY_LOOKUP.get(slugify(distance_key))
                or PR_KEY_LOOKUP.get(slugify(race_ref["distance"]))
            )
            if prs_key:
                athlete["prs"][prs_key] = {
                    "time": race_ref["finishTime"],
                    "race": {"raceId": race_ref["raceId"], "name": race_ref["name"]},
                    "date": race_ref["date"],
                }

        athlete["recentRaces"].sort(key=lambda r: r["date"], reverse=True)

        elo_scores = [score for score in athlete.pop("_elo_scores", []) if isinstance(score, int) and score > 0]
        athlete["eloScore"] = int(sum(elo_scores) / len(elo_scores)) if elo_scores else 1500
        finalized.append(athlete)
    return finalized


def upsert_documents(db, collection_name: str, docs: List[Dict[str, Any]], lookup_field: str) -> None:
    for doc in docs:
        db[collection_name].update_one(
            {lookup_field: doc[lookup_field]},
            {"$set": doc, "$setOnInsert": {"createdAt": datetime.now(timezone.utc)}},
            upsert=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Load race CSV files into MongoDB.")
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
        "--data-dir",
        default=Path(__file__).resolve().parents[1] / "data",
        help="Directory containing race CSV files.",
    )
    parser.add_argument(
        "--tls-ca-file",
        default=None,
        help="Path to a CA bundle for TLS (defaults to certifi bundle when available).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse and build documents without writing to Mongo.")

    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        raise SystemExit(f"Data directory not found: {data_dir}")

    race_docs: List[Dict[str, Any]] = []
    athletes: Dict[str, Dict[str, Any]] = {}

    for csv_path in sorted(data_dir.glob("*/*.csv")):
        race_docs.append(process_race_file(csv_path, athletes))

    athlete_docs = finalize_athletes(athletes)

    print(f"Prepared {len(race_docs)} race documents and {len(athlete_docs)} athlete documents.")

    if args.dry_run:
        return

    if MongoClient is None:
        raise SystemExit("Missing dependency: pymongo. Install with `python3 -m pip install pymongo`.")

    if not args.mongo_uri:
        raise SystemExit("Missing Mongo URI. Pass --mongo-uri or set MONGODB_URI.")

    tls_ca_file = args.tls_ca_file or (certifi.where() if certifi else None)
    client = MongoClient(args.mongo_uri, tlsCAFile=tls_ca_file)
    db = client[args.db]

    upsert_documents(db, "races", race_docs, "raceId")
    upsert_documents(db, "athletes", athlete_docs, "athleteId")

    print("Ingestion complete.")


if __name__ == "__main__":
    main()
