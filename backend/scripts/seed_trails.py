import argparse
import json
from pathlib import Path

from app.db import SessionLocal
from app.models import Trail


def load_trails():
    root = Path(__file__).resolve().parents[2]
    payload = json.loads((root / "data" / "trails" / "preloaded.json").read_text())
    return payload.get("hikes", [])


def main(reset: bool):
    session = SessionLocal()
    try:
        if reset:
            session.query(Trail).delete()
            session.commit()

        hikes = load_trails()
        created = 0
        updated = 0
        for hike in hikes:
            name = hike["name"]
            country = hike["countryCode"]
            state = hike.get("stateCode")
            trail = (
                session.query(Trail)
                .filter(Trail.name == name, Trail.country_code == country, Trail.state_code == state)
                .first()
            )
            if trail:
                trail.distance_miles = hike.get("distanceMiles", 0) or 0
                trail.elevation_gain_ft = hike.get("elevationGainFt", 0) or 0
                updated += 1
            else:
                session.add(
                    Trail(
                        name=name,
                        country_code=country,
                        state_code=state,
                        distance_miles=hike.get("distanceMiles", 0) or 0,
                        elevation_gain_ft=hike.get("elevationGainFt", 0) or 0,
                        is_seed=True,
                    )
                )
                created += 1
        session.commit()
        print(f"Seeded trails: {created} created, {updated} updated.")
    finally:
        session.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Delete existing trails first.")
    args = parser.parse_args()
    main(args.reset)
