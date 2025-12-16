#!/usr/bin/env python3
"""
Add a `draftLegal` boolean to every race document based on its distance label.

Sets `draftLegal` to True when the distance field ever looked like "draft legal"
(case-insensitive, tolerant of hyphens/spaces). All other races get `draftLegal`
set to False.

Usage (from repo root):
  python scripts/backfill_draft_legal_flag.py --mongo-uri "$MONGODB_URI"

You can dry-run to see the counts without writing:
  python scripts/backfill_draft_legal_flag.py --dry-run
"""
from __future__ import annotations

import argparse
import os
import re
from typing import Any, Dict, List

try:
    from pymongo import MongoClient, UpdateOne
except ImportError:  # pragma: no cover - dependency is optional until used
    MongoClient = None  # type: ignore[assignment]
    UpdateOne = None  # type: ignore[assignment]

try:
    import certifi
except ImportError:  # pragma: no cover
    certifi = None

DRAFT_DISTANCE_PATTERN = re.compile(r"Draft\s*-?\s*Legal", re.IGNORECASE)


def distance_was_draft_legal(distance: Any) -> bool:
    """Return True when the stored distance string looked like 'draft legal'."""
    if distance is None:
        return False
    normalized = str(distance).strip().lower()
    return bool(DRAFT_DISTANCE_PATTERN.search(normalized))


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill races.draftLegal based on distance labels.")
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
        "--batch-size",
        type=int,
        default=500,
        help="Number of updates to send per bulk write (default: 500).",
    )
    parser.add_argument(
        "--tls-ca-file",
        default=None,
        help="Path to a CA bundle for TLS (defaults to certifi bundle when available).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Calculate updates without writing to Mongo.")

    args = parser.parse_args()

    if MongoClient is None or UpdateOne is None:
        raise SystemExit("Missing dependency: pymongo. Install with `python3 -m pip install pymongo`.")
    if not args.mongo_uri:
        raise SystemExit("Missing Mongo URI. Pass --mongo-uri or set MONGODB_URI.")

    tls_ca_file = args.tls_ca_file or (certifi.where() if certifi else None)
    client = MongoClient(args.mongo_uri, tlsCAFile=tls_ca_file)
    db = client[args.db]
    races = db["races"]

    cursor = races.find({}, {"_id": 1, "raceId": 1, "distance": 1, "draftLegal": 1})

    pending_ops: List[Dict[str, Any]] = []
    totals = {"visited": 0, "set_true": 0, "set_false": 0, "unchanged": 0}

    for race in cursor:
        totals["visited"] += 1
        desired_flag = distance_was_draft_legal(race.get("distance"))
        current_flag = race.get("draftLegal")
        needs_distance_fix = desired_flag and race.get("distance") != "Sprint"

        if isinstance(current_flag, bool) and current_flag == desired_flag and not needs_distance_fix:
            totals["unchanged"] += 1
            continue

        if desired_flag:
            totals["set_true"] += 1
        else:
            totals["set_false"] += 1

        update_doc = {"draftLegal": desired_flag}
        if desired_flag:
            update_doc["distance"] = "Sprint"

        pending_ops.append(UpdateOne({"_id": race["_id"]}, {"$set": update_doc}))

        if len(pending_ops) >= args.batch_size:
            if not args.dry_run:
                result = races.bulk_write(pending_ops, ordered=False)
                print(f"Applied batch of {len(pending_ops)} updates (modified {result.modified_count})")
            pending_ops.clear()

    if pending_ops:
        if not args.dry_run:
            result = races.bulk_write(pending_ops, ordered=False)
            print(f"Applied final batch of {len(pending_ops)} updates (modified {result.modified_count})")

    client.close()

    print(
        "Finished scanning races. "
        f"Visited: {totals['visited']}, "
        f"set draftLegal=true: {totals['set_true']}, "
        f"set draftLegal=false: {totals['set_false']}, "
        f"unchanged: {totals['unchanged']}."
    )


if __name__ == "__main__":
    main()
