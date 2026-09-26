#!/usr/bin/env python3
"""Refresh data/workouts.json from F3 Nation's public region page.

regions.f3nation.com/<slug> server-renders the region's weekly schedule (the same
data behind map.f3nation.com) into its Next.js payload. No API token needed.
Standard library only, so it runs anywhere, including GitHub Actions.

Usage: python3 scripts/refresh_workouts.py
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

REGION_SLUG = "south-cary"
URL = f"https://regions.f3nation.com/{REGION_SLUG}"
OUT = Path(__file__).resolve().parent.parent / "data" / "workouts.json"
DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def fetch_payload(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "f3-south-cary-website/1.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html, re.S)
    return "".join(json.loads(f'"{c}"') for c in chunks)


def extract_workouts(payload: str) -> list[dict]:
    key = '"sortedWorkouts":'
    i = payload.find(key)
    if i < 0:
        raise ValueError("sortedWorkouts not found; the region page format may have changed")
    raw, _ = json.JSONDecoder().raw_decode(payload[i + len(key):])
    return raw


def clean(text):
    text = (text or "").strip()
    return "" if text in ("None", "null") else text


def normalize(w: dict) -> dict:
    start, _, end = (w.get("time") or "").partition(" - ")
    address = clean(w.get("location")).replace(",,", ",")
    address = re.sub(r",\s*(United States|USA)$", "", address)
    return {
        "id": str(w["id"]),
        "name": clean(w["name"]),
        "day": w["group"].lower(),
        "start": start.strip(),
        "end": end.strip(),
        "types": [t for t in (w.get("types") or [w.get("type")]) if t],
        "notes": clean(w.get("notes")),
        "address": address,
        "lat": round(float(w["latitude"]), 6),
        "lng": round(float(w["longitude"]), 6),
    }


def main() -> int:
    workouts = [normalize(w) for w in extract_workouts(fetch_payload(URL))]
    if not workouts:
        print("No workouts returned; leaving existing data untouched.", file=sys.stderr)
        return 1
    workouts.sort(key=lambda w: (DAYS.index(w["day"]), w["start"], w["name"].lower()))
    data = {"source": URL, "region": "F3 South Cary", "workouts": workouts}
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(workouts)} workouts to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
