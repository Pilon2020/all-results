#!/usr/bin/env python3
"""
Normalize race documents in an NDJSON file so every record matches the expected schema.

Target schema (from the race detail view):
- _id (ObjectId)
- raceId
- bikeDistance
- createdAt (ISO string)
- date (MM-DD-YYYY or ISO-parseable)
- distance
- finishers
- location
- name
- participants
- results (array)
- runDistance
- swimDistance
- weather
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable

CANONICAL_FIELDS = [
    "_id",
    "raceId",
    "bikeDistance",
    "createdAt",
    "date",
    "distance",
    "finishers",
    "location",
    "name",
    "participants",
    "results",
    "runDistance",
    "swimDistance",
    "weather",
]

DEFAULTS = {
    "bikeDistance": "Unknown",
    "distance": "Unknown distance",
    "finishers": 0,
    "location": "Unknown location",
    "name": "Unknown race",
    "participants": 0,
    "results": [],
    "runDistance": "Unknown",
    "swimDistance": "Unknown",
    "weather": "Unavailable",
}


def to_iso_datetime(value: Any) -> str:
    """Convert common date strings into an ISO timestamp."""
    now = datetime.now(timezone.utc)
    if value in (None, "", 0):
        return now.isoformat()

    if isinstance(value, dict) and "$date" in value:
        raw = value["$date"]
        value = raw if isinstance(raw, str) else str(raw)

    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%m-%d-%Y"):
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.isoformat()
    except ValueError:
        return now.isoformat()


def normalize_doc(raw: Dict[str, Any], field_order: Iterable[str]) -> Dict[str, Any]:
    doc: Dict[str, Any] = {**DEFAULTS, **raw}

    if not doc.get("createdAt"):
        doc["createdAt"] = to_iso_datetime(doc.get("date"))

    if not isinstance(doc.get("results"), list):
        doc["results"] = []

    ordered: Dict[str, Any] = {}
    for key in field_order:
        if key in doc:
            ordered[key] = doc[key]

    # Preserve any additional fields by appending them after the canonical set.
    for key, value in doc.items():
        if key not in ordered:
            ordered[key] = value

    return ordered


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize races NDJSON to the canonical schema.")
    parser.add_argument("--input", default="exports/races.ndjson", help="Path to the source NDJSON file.")
    parser.add_argument(
        "--output",
        default=None,
        help="Where to write the normalized file (defaults to overwriting the input).",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    output_path = Path(args.output) if args.output else input_path

    lines = [line for line in input_path.read_text().splitlines() if line.strip()]
    normalized_lines = []

    for line in lines:
        parsed = json.loads(line)
        normalized = normalize_doc(parsed, CANONICAL_FIELDS)
        normalized_lines.append(json.dumps(normalized, separators=(", ", ": "), ensure_ascii=False))

    output_path.write_text("\n".join(normalized_lines) + "\n")


if __name__ == "__main__":
    main()
