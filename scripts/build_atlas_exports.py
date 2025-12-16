#!/usr/bin/env python3
"""
Build Atlas-ready NDJSON files for the races and athletes collections without needing a DB connection.

Outputs:
  exports/races.ndjson     (one JSON document per line, ready for MongoDB Atlas import)
  exports/athletes.ndjson

Usage (from repo root):
  python scripts/build_atlas_exports.py

You can also override the data directory:
  python scripts/build_atlas_exports.py --data-dir ./data
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from datetime import datetime

from ingest_races import finalize_athletes, process_race_file

try:
    from bson import ObjectId
except ImportError:
    ObjectId = None  # type: ignore[assignment]


def _new_oid() -> str:
    if ObjectId is not None:
        return str(ObjectId())
    # Fallback: 24 hex chars
    return os.urandom(12).hex()


def _attach_object_ids(docs):
    for doc in docs:
        doc.setdefault("_id", {"$oid": _new_oid()})
    return docs

def _json_default(value):
    if isinstance(value, datetime):
        # Extended JSON format understood by Mongo import tools
        return {"$date": value.isoformat().replace("+00:00", "Z")}
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def write_ndjson(path: Path, docs) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for doc in docs:
            f.write(json.dumps(doc, ensure_ascii=False, default=_json_default))
            f.write("\n")


def main() -> None:
  parser = argparse.ArgumentParser(description="Generate Atlas NDJSON files from CSV race data.")
  parser.add_argument(
    "--data-dir",
    default=Path(__file__).resolve().parents[1] / "data",
    help="Directory containing race CSV files (default: ./data)",
  )
  parser.add_argument(
    "--out-dir",
    default=Path(__file__).resolve().parents[1] / "exports",
    help="Directory to write NDJSON files (default: ./exports)",
  )
  args = parser.parse_args()

  data_dir = Path(args.data_dir)
  out_dir = Path(args.out_dir)

  if not data_dir.exists():
    raise SystemExit(f"Data directory not found: {data_dir}")

  race_docs = []
  athletes = {}

  for csv_path in sorted(data_dir.glob("*/*.csv")):
    race_docs.append(process_race_file(csv_path, athletes))

  athlete_docs = finalize_athletes(athletes)

  write_ndjson(out_dir / "races.ndjson", _attach_object_ids(race_docs))
  write_ndjson(out_dir / "athletes.ndjson", _attach_object_ids(athlete_docs))

  print(f"Wrote {len(race_docs)} race docs to {out_dir / 'races.ndjson'}")
  print(f"Wrote {len(athlete_docs)} athlete docs to {out_dir / 'athletes.ndjson'}")


if __name__ == "__main__":
  main()
