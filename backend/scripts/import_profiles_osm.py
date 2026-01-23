import argparse
import json
import math
import time
import urllib.parse
import urllib.request

from app.db import SessionLocal
from app.models import Trail


OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OPENTOPO_URL = "https://api.opentopodata.org/v1/srtm90m"


def haversine_miles(lat1, lon1, lat2, lon2):
    radius_miles = 3958.8
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return radius_miles * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def fetch_json(url, data=None, retries=3, sleep_seconds=2):
    last_error = None
    for attempt in range(retries + 1):
        try:
            request = urllib.request.Request(url)
            if data is not None:
                payload = data.encode("utf-8")
                request = urllib.request.Request(url, data=payload)
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(sleep_seconds + attempt * 2)
                continue
            raise last_error


def build_overpass_query(name, country_code, state_code=None):
    country_code = country_code.upper()
    area_selector = 'area["ISO3166-1"="{code}"][admin_level=2]->.country;'.format(
        code=country_code
    )
    scope = "area.country"
    if state_code:
        iso_region = f"{country_code}-{state_code.upper()}"
        area_selector = (
            f'area["ISO3166-2"="{iso_region}"]->.region;'
            + "\n"
            + area_selector
        )
        scope = "area.region"
    return f"""
    [out:json][timeout:60];
    {area_selector}
    (
      relation["route"="hiking"]["name"~"^{name}$",i]({scope});
    );
    out body;
    >;
    out geom;
    """


def extract_geometry(elements):
    points = []
    for element in elements:
        if element.get("type") == "way" and "geometry" in element:
            for point in element["geometry"]:
                points.append((point["lat"], point["lon"]))
    deduped = []
    for lat, lon in points:
        if deduped and abs(deduped[-1][0] - lat) < 1e-6 and abs(deduped[-1][1] - lon) < 1e-6:
            continue
        deduped.append((lat, lon))
    return deduped


def downsample(points, target=60):
    if len(points) <= target:
        return points
    step = max(1, len(points) // target)
    sampled = points[::step]
    if sampled[-1] != points[-1]:
        sampled.append(points[-1])
    return sampled


def fetch_elevations(points):
    elevations = []
    batch_size = 50
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        locations = "|".join([f"{lat},{lon}" for lat, lon in batch])
        url = f"{OPENTOPO_URL}?locations={urllib.parse.quote(locations)}"
        response = fetch_json(url)
        results = response.get("results", [])
        elevations.extend([item.get("elevation") for item in results])
        time.sleep(1)
    return elevations


def build_profile(points, elevations):
    profile = []
    distance = 0.0
    for index, (lat, lon) in enumerate(points):
        if index > 0:
            distance += haversine_miles(points[index - 1][0], points[index - 1][1], lat, lon)
        elevation = elevations[index]
        if elevation is None:
            elevation = elevations[index - 1] if index > 0 else 0
        profile.append(
            {
                "distanceMiles": round(distance, 2),
                "elevationFt": round(elevation * 3.28084),
            }
        )
    return profile


def import_profiles(country_code, limit):
    session = SessionLocal()
    updated = 0
    skipped = 0
    try:
        query = session.query(Trail).filter(Trail.country_code == country_code)
        trails = query.order_by(Trail.id.asc()).all()
        for trail in trails:
            if trail.profile_points:
                skipped += 1
                continue
            if limit and updated >= limit:
                break
            name = trail.name.replace('"', "")
            print(f"Fetching profile for {name}...")
            query_text = build_overpass_query(name, country_code, trail.state_code)
            try:
                response = fetch_json(OVERPASS_URL, query_text, retries=4, sleep_seconds=3)
            except Exception as exc:
                print(f"  Overpass failed for {name}: {exc}")
                skipped += 1
                time.sleep(2)
                continue
            elements = response.get("elements", [])
            points = extract_geometry(elements)
            if len(points) < 2:
                print(f"  No geometry found for {name}.")
                skipped += 1
                continue
            points = downsample(points, 80)
            try:
                elevations = fetch_elevations(points)
            except Exception as exc:
                print(f"  Elevation lookup failed for {name}: {exc}")
                skipped += 1
                time.sleep(2)
                continue
            if len(elevations) != len(points):
                print(f"  Elevation lookup failed for {name}.")
                skipped += 1
                continue
            trail.profile_points = build_profile(points, elevations)
            session.add(trail)
            session.commit()
            updated += 1
            time.sleep(2)
        print(f"Profiles updated: {updated}, skipped: {skipped}")
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True, help="Country code (e.g. US, IN)")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of trails to update")
    args = parser.parse_args()
    import_profiles(args.country.upper(), args.limit)


if __name__ == "__main__":
    main()
