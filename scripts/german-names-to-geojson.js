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

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Degrees of padding added around Nominatim's own matched geometry before
// asking Overpass for every way with that name inside it - roughly 1.5km,
// generous enough to pick up the far end of a long avenue Nominatim's
// limited result set didn't quite reach, but nowhere near big enough to
// cross into a different part of the city.
const OVERPASS_BBOX_PADDING = 0.015;

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

// Nominatim is a geocoder, not a database dump tool: its own index of a
// long street rarely covers every way that carries its name, and a result
// limit (even the documented max of 40) caps whatever it does know about.
// A street split into dozens of OSM ways at intersections (Marynarki
// Polskiej in Gdańsk has 83) ends up rendered as an arbitrary handful of
// disconnected fragments instead of the whole thing.
//
// Overpass is the right tool for "every way named X in this area" - no
// artificial cap - but it needs the *exact* OSM name tag, while the CSV
// often has a shortened colloquial form (e.g. "Kościuszki" for the
// actually-tagged "Tadeusza Kościuszki") that only Nominatim's fuzzy
// street-name matching resolves. So: ask Nominatim first to resolve the
// canonical name, then ask Overpass for every way with that exact name.
//
// The public instance is shared and occasionally returns a 504 under
// load; retried a few times with backoff before giving up.
async function overpassWaysByName(name, bbox, attempt = 1) {
  const query = `[out:json][timeout:60];way["name"="${name.replace(/"/g, '\\"')}"](${bbox});out geom;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    if (attempt < 4) {
      await delay(attempt * 5000);
      return overpassWaysByName(name, bbox, attempt + 1);
    }
    console.warn(
      `  ! Overpass ${res.status} for "${name}" after ${attempt} attempts`,
    );
    return [];
  }

  const data = await res.json();
  return data.elements.filter((e) => e.type === "way" && e.geometry?.length);
}

// Builds a LineString/MultiLineString from Overpass ways, or a
// Polygon/MultiPolygon if every way turned out to be a closed loop (the
// odd historical market square tagged as a single looping way rather
// than an area relation).
function geometryFromOverpassWays(ways) {
  const rings = [];
  const lines = [];

  for (const way of ways) {
    const coords = way.geometry.map((pt) => [pt.lon, pt.lat]);
    const isClosed =
      coords.length >= 4 &&
      coords[0][0] === coords[coords.length - 1][0] &&
      coords[0][1] === coords[coords.length - 1][1];
    (isClosed ? rings : lines).push(coords);
  }

  if (lines.length) {
    return lines.length === 1
      ? { type: "LineString", coordinates: lines[0] }
      : { type: "MultiLineString", coordinates: lines };
  }

  if (rings.length) {
    return rings.length === 1
      ? { type: "Polygon", coordinates: [rings[0]] }
      : { type: "MultiPolygon", coordinates: rings.map((ring) => [ring]) };
  }

  return null;
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
    limit: "40",
  });

  // Even Nominatim's own result set occasionally mixes in one stray match
  // from a same-named but entirely different street elsewhere in the city
  // (common Polish street names like Oliwska/Kasztanowa/Starowiejska each
  // independently recur a few km apart) - keep only the largest spatially
  // coherent cluster before trusting it for the canonical name or bbox,
  // so that one outlier doesn't drag in an unrelated street via Overpass.
  const highwayResults = largestCluster(
    results.filter((r) => hasCategory(r, STREET_CATEGORIES)),
    3,
  );
  const canonicalName = mostCommonName(highwayResults);
  const bbox = boundingBoxOf(highwayResults);

  if (canonicalName && bbox) {
    await delay(500);
    const ways = await overpassWaysByName(canonicalName, bbox);
    const geometry = geometryFromOverpassWays(ways);
    if (geometry) return geometry;
  }

  // Overpass found nothing (transient failure, or a name Nominatim
  // resolved but Overpass's exact match didn't turn up) - fall back to
  // whatever Nominatim itself returned rather than losing the street
  // entirely.
  return pickStreetGeometry(results);
}

// Groups results into clusters of mutually-nearby centroids (union-find
// over pairs within thresholdKm of each other - a long street's own
// segments chain together transitively even if the whole avenue spans
// many km, while a genuinely separate street elsewhere never links up)
// and returns only the largest cluster's members.
function largestCluster(results, thresholdKm) {
  if (results.length <= 1) return results;

  const centroids = results.map((r) => {
    const coords =
      r.geojson?.type === "LineString"
        ? r.geojson.coordinates
        : r.geojson?.type === "MultiLineString"
          ? r.geojson.coordinates.flat()
          : [];
    if (!coords.length) return null;
    const lats = coords.map((c) => c[1]);
    const lons = coords.map((c) => c[0]);
    return [
      lons.reduce((a, b) => a + b, 0) / lons.length,
      lats.reduce((a, b) => a + b, 0) / lats.length,
    ];
  });

  const distKm = (a, b) => {
    const dlat = (a[1] - b[1]) * 111;
    const dlon = (a[0] - b[0]) * 111 * Math.cos((a[1] * Math.PI) / 180);
    return Math.sqrt(dlat * dlat + dlon * dlon);
  };

  const parent = results.map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < centroids.length; i++) {
    if (!centroids[i]) continue;
    for (let j = i + 1; j < centroids.length; j++) {
      if (!centroids[j]) continue;
      if (distKm(centroids[i], centroids[j]) <= thresholdKm) union(i, j);
    }
  }

  const groups = new Map();
  for (let i = 0; i < results.length; i++) {
    const root = centroids[i] ? find(i) : `ungrouped-${i}`;
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(results[i]);
  }

  let best = [];
  for (const group of groups.values()) {
    if (group.length > best.length) best = group;
  }
  return best;
}

// The exact OSM name tag, read off whichever Nominatim result it shares
// across the most candidates - guards against an occasional mismatched
// result (a differently-tagged nearby way) outvoting the real name.
function mostCommonName(results) {
  const counts = new Map();
  for (const r of results) {
    if (!r.name) continue;
    counts.set(r.name, (counts.get(r.name) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

// A padded bounding box around Nominatim's own matched geometry, used to
// scope the Overpass "every way named X" query to where this specific
// street actually is - deliberately *not* the whole city. Many short,
// everyday street names (Długa/"Long street", Polna/"Field street", ...)
// independently recur in several unrelated parts of a sprawling city's
// administrative area; an unscoped citywide query would merge all of
// them into one nonsensical shape spanning the entire city instead of
// the one street actually being geocoded.
function boundingBoxOf(results) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const r of results) {
    const coords =
      r.geojson?.type === "LineString"
        ? r.geojson.coordinates
        : r.geojson?.type === "MultiLineString"
          ? r.geojson.coordinates.flat()
          : null;
    if (!coords) continue;

    for (const [lon, lat] of coords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
  }

  if (minLat === Infinity) return null;

  const p = OVERPASS_BBOX_PADDING;
  return `${minLat - p},${minLon - p},${maxLat + p},${maxLon + p}`;
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

  // A transient network blip partway through (ECONNRESET, a timeout, a
  // flaky public Overpass instance, ...) shouldn't take down a run that's
  // many minutes into geocoding hundreds of records and lose everything -
  // catch per-record, keep going with no geometry for that one, and flush
  // to disk periodically so a crash doesn't throw away prior progress.
  const flush = () => {
    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify({ type: "FeatureCollection", features }, null, 2) + "\n",
    );
  };

  const geocodeRecord = async (record, exists, geocode) => {
    processed++;
    let geometry = null;

    if (exists) {
      try {
        geometry = await geocode();
      } catch (err) {
        console.warn(`  ! ${record.german}: ${err.message}`);
      }
      await delay(1100);
    }

    features.push(toFeature(record, exists, geometry));
    if (processed % 20 === 0) flush();
  };

  for (const record of localities) {
    const exists = !record.polish.toLowerCase().startsWith("nie istnieje");
    console.log(`[${processed + 1}/${total}] locality: ${record.german}`);
    await geocodeRecord(record, exists, () =>
      geocodeArea(queryName(record.polish), "województwo pomorskie"),
    );
  }

  for (const record of districts) {
    const exists = !record.polish.toLowerCase().startsWith("nie istnieje");
    console.log(`[${processed + 1}/${total}] district: ${record.german}`);
    await geocodeRecord(record, exists, () =>
      geocodeArea(queryName(record.polish), "Gdańsk"),
    );
  }

  for (const record of streets) {
    const exists = !record.polish.toLowerCase().startsWith("nie istnieje");
    console.log(
      `[${processed + 1}/${total}] street (${record.city}): ${record.german}`,
    );
    await geocodeRecord(record, exists, () =>
      geocodeStreet(queryName(record.polish), record.city),
    );
  }

  flush();

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
