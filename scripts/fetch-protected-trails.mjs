import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Country, State } from "country-state-city";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "../data/trails/preloaded.json");

const SUPPORTED_COUNTRIES = ["US", "IN"];
const PROTECTED_NAME_BY_COUNTRY = {
  US: "National Park|National Forest",
  IN: "National Park|Wildlife Sanctuary|Tiger Reserve",
};

const OVERPASS_ENDPOINTS = ["https://overpass.kumi.systems/api/interpreter"];

const LIMIT_PER_STATE = Number(process.env.TRAIL_LIMIT ?? "6");
const MAX_PARKS_PER_STATE = Number(process.env.PARK_LIMIT ?? "3");
const MIN_DISTANCE_MILES = 0.6;
const MIN_DISTANCE_ABS = 0.2;

function haversineMiles(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

function computeDistanceMiles(geometry) {
  if (!geometry || geometry.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < geometry.length; i += 1) {
    total += haversineMiles(geometry[i - 1], geometry[i]);
  }
  return Number(total.toFixed(2));
}

function enforceQuality(distanceMiles) {
  if (distanceMiles <= MIN_DISTANCE_ABS) return false;
  if (distanceMiles < MIN_DISTANCE_MILES) return false;
  return true;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOverpass(query) {
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            "User-Agent": "HikeSim/1.0 (data-preload)",
          },
          body: query,
          signal: controller.signal,
        });
        const text = await response.text();
        if (response.ok) {
          if (text.trim().startsWith("<")) {
            if (process.env.DEBUG_OVERPASS === "1") {
              console.warn(
                `Overpass ${endpoint} returned HTML: ${text
                  .slice(0, 200)
                  .replace(/\\s+/g, " ")}`
              );
            }
            lastError = `Overpass ${endpoint} returned HTML error`;
            await sleep(1500);
            continue;
          }
          const data = JSON.parse(text);
          clearTimeout(timeout);
          return data;
        }
        if (process.env.DEBUG_OVERPASS === "1") {
          console.warn(
            `Overpass ${endpoint} ${response.status}: ${text
              .slice(0, 200)
              .replace(/\\s+/g, " ")}`
          );
        }
        lastError = `Overpass ${endpoint} responded ${response.status}`;
        if (response.status === 429 || response.status === 504) {
          await sleep(1500);
        }
      } catch (error) {
        if (process.env.DEBUG_OVERPASS === "1") {
          console.warn(`Overpass ${endpoint} failed: ${error.message ?? error}`);
        }
        lastError = `Overpass ${endpoint} failed`;
        await sleep(1500);
      } finally {
        clearTimeout(timeout);
      }
    }
  }
  throw new Error(lastError ?? "Overpass fetch failed");
}

function buildProtectedAreasQuery(countryCode, stateName, stateCode, namePattern) {
  return `
    [out:json][timeout:60];
    area["ISO3166-1"="${countryCode}"][admin_level=2]->.country;
    ${
      stateCode
        ? `area["ISO3166-2"="${countryCode}-${stateCode}"](area.country)->.searchArea;`
        : stateName
          ? `area["name"="${stateName}"]["admin_level"~"4|6"](area.country)->.searchArea;`
          : "(.country)->.searchArea;"
    }
    (
      relation["boundary"="national_park"](area.searchArea);
      relation["boundary"="national_forest"](area.searchArea);
      relation["boundary"="protected_area"]["name"~"${namePattern}",i](area.searchArea);
      relation["leisure"="nature_reserve"]["name"~"${namePattern}",i](area.searchArea);
    )->.parks;
    out ids tags;
  `;
}

async function lookupStateCenter(stateName, countryCode) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", stateName);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("country_code", countryCode.toLowerCase());
  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const data = await response.json();
  const first = data.results?.[0];
  if (!first) return null;
  return { lat: first.latitude, lon: first.longitude };
}

function buildProtectedAreasAroundQuery(lat, lon, namePattern, radiusMeters = 250000) {
  return `
    [out:json][timeout:60];
    (
      relation["boundary"="national_park"](around:${radiusMeters},${lat},${lon});
      relation["boundary"="national_forest"](around:${radiusMeters},${lat},${lon});
      relation["boundary"="protected_area"]["name"~"${namePattern}",i](around:${radiusMeters},${lat},${lon});
      relation["leisure"="nature_reserve"]["name"~"${namePattern}",i](around:${radiusMeters},${lat},${lon});
    )->.parks;
    out ids tags;
  `;
}

function buildParkTrailsQuery(relationId, limit) {
  return `
    [out:json][timeout:60];
    rel(${relationId});
    map_to_area -> .park;
    (
      relation["route"="hiking"]["name"](area.park);
      relation["route"="foot"]["sac_scale"]["name"](area.park);
      way["highway"~"path|footway|track"]["sac_scale"]["name"]["footway"!="sidewalk"](area.park);
      way["highway"="path"]["trail_visibility"]["name"](area.park);
    );
    out body geom ${limit};
  `;
}

async function fetchStateTrails(countryCode, stateCode) {
  const stateName = State.getStatesOfCountry(countryCode).find(
    (state) => state.isoCode === stateCode
  )?.name;
  const namePattern = PROTECTED_NAME_BY_COUNTRY[countryCode] ?? "National Park";
  let parksQuery = buildProtectedAreasQuery(countryCode, stateName ?? null, stateCode, namePattern);
  let parks = (await fetchOverpass(parksQuery)).elements ?? [];
  let usedFallback = false;

  if (parks.length === 0 && stateName) {
    const center = await lookupStateCenter(stateName, countryCode);
    if (center) {
      parksQuery = buildProtectedAreasAroundQuery(center.lat, center.lon, namePattern);
      parks = (await fetchOverpass(parksQuery)).elements ?? [];
      usedFallback = true;
    }
  }

  const trailElements = [];
  const uniqueParkIds = new Set();
  for (const park of parks.slice(0, MAX_PARKS_PER_STATE)) {
    if (!park.id || uniqueParkIds.has(park.id)) continue;
    uniqueParkIds.add(park.id);
    const trailsQuery = buildParkTrailsQuery(park.id, LIMIT_PER_STATE);
    const trailResponse = await fetchOverpass(trailsQuery);
    trailElements.push(...(trailResponse.elements ?? []));
  }

  return { elements: trailElements, usedFallback };
}

async function main() {
  const hikes = [];

  const stateFilter = process.env.STATE_ONLY?.toUpperCase();
  const countryFilter = process.env.COUNTRY_ONLY?.toUpperCase();

  for (const countryCode of SUPPORTED_COUNTRIES) {
    if (countryFilter && countryCode !== countryFilter) continue;
    const states = State.getStatesOfCountry(countryCode).filter(
      (state) => state.isoCode.length === 2
    );
    const countryName = Country.getCountryByCode(countryCode)?.name ?? countryCode;
    for (const state of states) {
      if (stateFilter && state.isoCode !== stateFilter) continue;
      console.log(`Fetching ${countryName} - ${state.name}...`);
      try {
        const { elements, usedFallback } = await fetchStateTrails(countryCode, state.isoCode);
        const seen = new Set();
        for (const element of elements ?? []) {
          const name = element.tags?.name?.trim();
          if (!name || !element.geometry || element.geometry.length < 2) continue;
          const key = `${countryCode}-${state.isoCode}-${name}`;
          if (seen.has(key)) continue;
          const distanceMiles = computeDistanceMiles(element.geometry);
          if (!enforceQuality(distanceMiles)) continue;
          const elevationGainFt = Math.max(200, Math.round(distanceMiles * 300));
          hikes.push({
            name,
            distanceMiles,
            elevationGainFt,
            countryCode,
            stateCode: state.isoCode,
            source: usedFallback ? "osm_protected_nearest" : "osm_protected",
          });
          seen.add(key);
          if (seen.size >= LIMIT_PER_STATE) break;
        }
      } catch (error) {
        console.warn(`Failed ${countryCode}-${state.isoCode}: ${error.message}`);
      }
      await sleep(1000);
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), hikes }, null, 2));
  console.log(`Saved ${hikes.length} hikes to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
