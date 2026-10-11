import fs from "fs";

// One-time data-prep script: reads the German/Polish place name index
// transcribed from the book photos (names/german-polish-names.csv) and
// geocodes each entry against OpenStreetMap/Nominatim, producing the
// GeoJSON FeatureCollection consumed by the `german_names` content
// collection. Not run at build time - re-run manually when the CSV changes.

const CSV_PATH = "names/german-polish-names.csv";
const OUTPUT_PATH = "src/content/german_names/names.json";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim's usage policy requires a way to identify the calling
// application - a repo URL satisfies that without sending anyone's
// personal contact details to a third-party service.
const USER_AGENT =
  "tricity-hiking-german-names-script (+https://github.com/ertrzyiks/tricity-hiking)";

// Roughly the Tricity + Żuławy region, used to keep Nominatim from
// matching villages with the same name elsewhere in Poland.
const VIEWBOX = "17.5,54.95,19.6,53.7";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseCSV(text) {
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      pushField();
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) pushRow();

  return rows.filter((r) => r.length > 1 && r.some((v) => v !== ""));
}

function queryName(polish) {
  const obecnieMatch = polish.match(/\(obecnie:\s*([^)]+)\)/i);
  if (obecnieMatch) return obecnieMatch[1].trim();
  return polish.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

async function nominatimSearch(params) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("viewbox", VIEWBOX);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!res.ok) {
    console.warn(`  ! Nominatim ${res.status} for ${url}`);
    return [];
  }
  return res.json();
}

// Rough shoelace area of a polygon's outer ring, in degree^2 - only ever
// used to compare candidates' relative sizes, never as a real area.
function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function geomArea(geom) {
  if (geom.type === "Polygon") return ringArea(geom.coordinates[0]);
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.reduce((sum, poly) => sum + ringArea(poly[0]), 0);
  }
  return 0;
}

// Nominatim's jsonv2 "category" field (osm "class") - e.g. "highway",
// "boundary", "place", "office", "waterway". Used to reject matches that
// share a name with the place/street we're after but are a completely
// different kind of thing (a parish office happening to be named the same
// as a street query, a river sharing a village's name, ...).
function hasCategory(result, allowed) {
  return allowed.has(result.category);
}

const STREET_CATEGORIES = new Set(["highway"]);
const AREA_CATEGORIES = new Set([
  "boundary",
  "place",
  "natural",
  "waterway",
  "water",
]);

// When an area name matches both the place itself and a much larger
// containing unit (a village and the gmina/powiat that contains it, which
// Nominatim happily returns side by side), merging both would produce a
// polygon many times too big. Keep only candidates within 4x the smallest
// match's area - wide enough to still merge legitimate same-scale siblings
// (e.g. Wrzeszcz Górny + Wrzeszcz Dolny), narrow enough to drop containers.
function dropOversizedOutliers(geoms) {
  if (geoms.length <= 1) return geoms;
  const areas = geoms.map(geomArea);
  const minArea = Math.min(...areas.filter((a) => a > 0)) || 0;
  if (minArea === 0) return geoms;
  return geoms.filter((_, i) => areas[i] / minArea <= 4);
}

function mergeLines(geoms) {
  const coordsArrays = [];
  for (const g of geoms) {
    if (g.type === "LineString") coordsArrays.push(g.coordinates);
    else if (g.type === "MultiLineString") coordsArrays.push(...g.coordinates);
  }
  if (coordsArrays.length === 1) {
    return { type: "LineString", coordinates: coordsArrays[0] };
  }
  return { type: "MultiLineString", coordinates: coordsArrays };
}

function mergePolygons(geoms) {
  const polys = [];
  for (const g of geoms) {
    if (g.type === "Polygon") polys.push(g.coordinates);
    else if (g.type === "MultiPolygon") polys.push(...g.coordinates);
  }
  if (polys.length === 1) {
    return { type: "Polygon", coordinates: polys[0] };
  }
  return { type: "MultiPolygon", coordinates: polys };
}

// Streets: a line is the correct shape, with the odd historical market
// square (Polygon) as fallback. Restricted to category "highway" - without
// it, a street name that doesn't actually exist in OSM can fall through to
// an unrelated same-named point/building (e.g. "Parafialna" matching scattered
// "Kancelaria parafialna" parish offices across the whole city).
function pickStreetGeometry(results) {
  const candidates = results.filter((r) => hasCategory(r, STREET_CATEGORIES));

  const lines = candidates.filter((r) =>
    ["LineString", "MultiLineString"].includes(r.geojson?.type),
  );
  if (lines.length) return mergeLines(lines.map((r) => r.geojson));

  const polys = candidates.filter((r) =>
    ["Polygon", "MultiPolygon"].includes(r.geojson?.type),
  );
  if (polys.length) {
    const kept = dropOversizedOutliers(polys.map((r) => r.geojson));
    return mergePolygons(kept);
  }

  const points = candidates.filter((r) => r.geojson?.type === "Point");
  if (points.length) return points[0].geojson;

  return null;
}

// Nominatim's "addresstype" for a result that *contains* the place we
// searched for, rather than being the place itself - a village sharing its
// name with the gmina/powiat around it is the common case (e.g. "Pszczółki"
// matches both the village and "gmina Pszczółki", several times its size).
// Blacklisted rather than whitelisting the good types, since legitimate
// specific types vary a lot (village, town, city, hamlet, suburb, quarter,
// waterway, water, ...) and a blacklist degrades safely to "unrecognised
// type, keep it" instead of silently dropping a valid but unlisted one.
const CONTAINER_ADDRESSTYPES = new Set([
  "municipality",
  "county",
  "state_district",
  "state",
  "country",
  "region",
]);

// Districts/localities: a polygon boundary is the correct shape, falling
// back to a point. LineString matches are deliberately never used here -
// free-text name search frequently turns up an unrelated river, stream, or
// boundary way that happens to share the name (e.g. "Kłodawa" is both a
// village and a stream near Gdańsk), which would otherwise outrank the
// right village/district match. Results are also restricted to plausible
// area categories; container-level matches (the gmina/powiat around the
// named place) are preferred away in favour of the place itself, and
// same-named candidates still at wildly different scales after that are
// pruned down to the smallest/most specific one instead of merging - see
// dropOversizedOutliers.
function pickAreaGeometry(results) {
  let candidates = results.filter((r) => hasCategory(r, AREA_CATEGORIES));

  const nonContainers = candidates.filter(
    (r) => !CONTAINER_ADDRESSTYPES.has(r.addresstype),
  );
  if (nonContainers.length) candidates = nonContainers;

  const polys = candidates.filter((r) =>
    ["Polygon", "MultiPolygon"].includes(r.geojson?.type),
  );
  if (polys.length) {
    const kept = dropOversizedOutliers(polys.map((r) => r.geojson));
    return mergePolygons(kept);
  }

  const points = candidates.filter((r) => r.geojson?.type === "Point");
  if (points.length) return points[0].geojson;

  return null;
}

async function geocodeStreet(name, city) {
  const results = await nominatimSearch({
    street: name,
    city,
    country: "Polska",
  });
  return pickStreetGeometry(results);
}

async function geocodeArea(name, context) {
  const results = await nominatimSearch({
    q: `${name}, ${context}, Polska`,
  });
  return pickAreaGeometry(results);
}

async function run() {
  const csvText = fs.readFileSync(CSV_PATH, "utf8");
  const [, ...rows] = parseCSV(csvText);
  const records = rows.map((r) => ({
    german: r[0],
    polish: r[1],
    category: r[2],
    // Only meaningful for category "street name" - which city to geocode
    // the street against (Gdańsk or Sopot's section of the book).
    city: r[3] || undefined,
  }));

  const localities = records.filter((r) => r.category === "locality name");
  const districts = records.filter((r) => r.category === "district name");
  const streets = records.filter((r) => r.category === "street name");

  for (const record of streets) {
    if (record.city !== "Gdańsk" && record.city !== "Sopot") {
      throw new Error(
        `Street "${record.german}" has no (or an unrecognised) city column value: ${JSON.stringify(record.city)}`,
      );
    }
  }

  const features = [];
  let processed = 0;
  const total = records.length;

  for (const record of localities) {
    processed++;
    const exists = !record.polish.toLowerCase().startsWith("nie istnieje");
    let geometry = null;

    if (exists) {
      console.log(`[${processed}/${total}] locality: ${record.german}`);
      geometry = await geocodeArea(
        queryName(record.polish),
        "województwo pomorskie",
      );
      await delay(1100);
    }

    features.push(toFeature(record, exists, geometry));
  }

  for (const record of districts) {
    processed++;
    const exists = !record.polish.toLowerCase().startsWith("nie istnieje");
    let geometry = null;

    if (exists) {
      console.log(`[${processed}/${total}] district: ${record.german}`);
      geometry = await geocodeArea(queryName(record.polish), "Gdańsk");
      await delay(1100);
    }

    features.push(toFeature(record, exists, geometry));
  }

  for (const record of streets) {
    processed++;
    const exists = !record.polish.toLowerCase().startsWith("nie istnieje");
    let geometry = null;

    if (exists) {
      console.log(
        `[${processed}/${total}] street (${record.city}): ${record.german}`,
      );
      geometry = await geocodeStreet(queryName(record.polish), record.city);
      await delay(1100);
    }

    features.push(toFeature(record, exists, geometry));
  }

  const featureCollection = { type: "FeatureCollection", features };
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(featureCollection, null, 2) + "\n",
  );

  const withGeometry = features.filter((f) => f.geometry !== null).length;
  console.log(
    `\nWrote ${features.length} features to ${OUTPUT_PATH} (${withGeometry} with geometry, ${features.length - withGeometry} without).`,
  );
}

function toFeature(record, exists, geometry) {
  return {
    type: "Feature",
    properties: {
      german: record.german,
      polish: record.polish,
      category: record.category,
      ...(record.city ? { city: record.city } : {}),
      exists,
    },
    geometry,
  };
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
