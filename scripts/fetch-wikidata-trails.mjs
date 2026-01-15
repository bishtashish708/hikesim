import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Country, State } from "country-state-city";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "../data/trails/preloaded.json");

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

const COUNTRY_CONFIG = {
  US: {
    qid: "Q30",
    name: "United States",
    trailTypes: ["Q2143825"],
    fallbackTypes: ["Q46169", "Q3079027"],
    stateType: "Q35657",
    includeFallback: false,
  },
  IN: {
    qid: "Q668",
    name: "India",
    trailTypes: ["Q2143825"],
    fallbackTypes: ["Q46169", "Q19311633"],
    stateType: "Q12443800",
    includeFallback: true,
  },
};

const KM_TO_MILES = 0.621371;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSparql(query, retries = 4) {
  const url = new URL(WIKIDATA_ENDPOINT);
  url.searchParams.set("format", "json");
  url.searchParams.set("query", query);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "HikeSim/1.0 (data-preload)" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (response.ok) {
      return response.json();
    }
    if (response.status === 429 && attempt < retries) {
      await sleep(1500 + attempt * 1000);
      continue;
    }
    throw new Error(`Wikidata responded ${response.status}`);
  }
  throw new Error("Wikidata failed");
}

function normalizeState(stateName, countryCode) {
  if (!stateName) return null;
  const states = State.getStatesOfCountry(countryCode);
  const normalized = stateName.toLowerCase();
  const exact = states.find((state) => state.name.toLowerCase() === normalized);
  if (exact) return exact.isoCode;
  const contains = states.find((state) => normalized.includes(state.name.toLowerCase()));
  if (contains) return contains.isoCode;
  return null;
}

async function fetchPaginated(queryBase, pageSize = 100, label = "") {
  const results = [];
  let offset = 0;
  let page = 1;
  const maxPages = 30;
  while (true) {
    if (page > maxPages) break;
    const query = `${queryBase}\nLIMIT ${pageSize}\nOFFSET ${offset}`;
    if (label) {
      console.log(`  ${label}: page ${page} (offset ${offset})`);
    }
    const data = await runSparql(query);
    const rows = data.results.bindings ?? [];
    results.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
    page += 1;
    await sleep(1200);
  }
  return results;
}

async function fetchTrails(countryCode) {
  const config = COUNTRY_CONFIG[countryCode];
  const trails = [];

  const trailTypeValues = config.trailTypes.map((type) => `wd:${type}`).join(" ");
  const trailQuery = `
    SELECT ?trail ?trailLabel ?stateLabel ?length WHERE {
      VALUES ?type { ${trailTypeValues} }
      ?trail wdt:P31/wdt:P279* ?type;
             wdt:P17 wd:${config.qid}.
      ?trail wdt:P131 ?state.
      ?state wdt:P31/wdt:P279* wd:${config.stateType}.
      OPTIONAL { ?trail wdt:P2043 ?length. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;

  const trailRows = await fetchPaginated(trailQuery, 100, `${countryCode} trails`);
  for (const row of trailRows) {
    const name = row.trailLabel?.value?.trim();
    if (!name) continue;
    const stateLabel = row.stateLabel?.value ?? null;
    const stateCode = normalizeState(stateLabel, countryCode);
    if (!stateCode) continue;
    const lengthKm = row.length?.value ? Number(row.length.value) : null;
    const distanceMiles = lengthKm != null && !Number.isNaN(lengthKm)
      ? Number((lengthKm * KM_TO_MILES).toFixed(2))
      : 0;
    const elevationGainFt = distanceMiles > 0 ? Math.round(distanceMiles * 200) : 0;
    trails.push({
      name,
      distanceMiles,
      elevationGainFt,
      countryCode,
      stateCode,
      source: "wikidata_trail",
    });
  }

  if (config.includeFallback) {
    const fallbackTypeValues = config.fallbackTypes.map((type) => `wd:${type}`).join(" ");
    const fallbackQuery = `
      SELECT ?place ?placeLabel ?stateLabel WHERE {
        VALUES ?type { ${fallbackTypeValues} }
        ?place wdt:P31/wdt:P279* ?type;
               wdt:P17 wd:${config.qid}.
        ?place wdt:P131 ?state.
        ?state wdt:P31/wdt:P279* wd:${config.stateType}.
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
    `;

    const fallbackRows = await fetchPaginated(
      fallbackQuery,
      100,
      `${countryCode} protected areas`
    );
    for (const row of fallbackRows) {
      const name = row.placeLabel?.value?.trim();
      if (!name) continue;
      const stateLabel = row.stateLabel?.value ?? null;
      const stateCode = normalizeState(stateLabel, countryCode);
      if (!stateCode) continue;
      trails.push({
        name,
        distanceMiles: 0,
        elevationGainFt: 0,
        countryCode,
        stateCode,
        source: "wikidata_protected_area",
      });
    }
  }

  return trails;
}

async function main() {
  const hikes = [];
  for (const countryCode of Object.keys(COUNTRY_CONFIG)) {
    const countryName = Country.getCountryByCode(countryCode)?.name ?? countryCode;
    console.log(`Fetching Wikidata trails for ${countryName}...`);
    const trails = await fetchTrails(countryCode);
    hikes.push(...trails);
    await sleep(1000);
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), hikes }, null, 2)
  );
  console.log(`Saved ${hikes.length} hikes to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
