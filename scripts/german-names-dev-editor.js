import fs from "node:fs";

const DATA_PATH = "./src/content/german_names/names.json";
const CATEGORIES = [
  "street name",
  "district name",
  "locality name",
  "valley name",
];
const CITIES = ["Gdańsk", "Sopot"];
const CATEGORIES_WITH_CITY = ["street name", "valley name"];
const API_ROUTE = "/api/german-names";
const PAGE_ROUTE = "/dev/german-names";

const PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>German names editor (dev)</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; }
    </style>
  </head>
  <body>
    <div class="max-w-(--breakpoint-xl) mx-auto py-4 px-2 lg:px-0">
      <h2 class="text-3xl my-4">German names editor</h2>
      <p class="text-slate-600 my-2">
        Dev-only tool for reviewing and fixing entries in the <code>german_names</code>
        content collection. Changes save straight to
        <code>src/content/german_names/names.json</code> - rerun the map page to see them.
      </p>
      <div id="root"></div>
    </div>
    <script type="module" src="/scripts/dev-editor-entry.tsx"></script>
  </body>
</html>
`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

// Dev-only backend for the /dev/german-names/ editor page: serves and
// saves src/content/german_names/names.json. This is Vite middleware
// rather than an Astro API route because this (otherwise static,
// adapter-less) site prerenders endpoints by default - a POST to a
// prerendered Astro route is rejected by Astro's own router before the
// handler ever sees the body. `apply: "serve"` keeps this out of `astro
// build`/`vite build` entirely, so there's no need for an SSR adapter just
// to host one dev tool.
export function germanNamesEditorMiddleware() {
  return {
    name: "german-names-editor",
    apply: "serve",
    configureServer(server) {
      // The editor page itself (not just its data API) is served this way
      // too - anything reachable from src/pages gets scanned by Astro's
      // build for client-island chunks regardless of whether that page's
      // getStaticPaths ever actually emits a route, so an Astro page here
      // would leave a stray (unreferenced but still shipped) JS chunk in
      // the production bundle. Living outside src/pages, loaded only via
      // Vite's dev transform pipeline, keeps it completely out of `astro
      // build`.
      server.middlewares.use(PAGE_ROUTE, (req, res, next) => {
        if (req.method !== "GET") return next();
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.end(PAGE_HTML);
      });

      server.middlewares.use(API_ROUTE, async (req, res) => {
        if (req.method === "GET") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(fs.readFileSync(DATA_PATH, "utf-8"));
          return;
        }

        if (req.method === "POST") {
          let body;
          try {
            body = JSON.parse(await readBody(req));
          } catch {
            sendJson(res, 400, { error: "Invalid JSON body" });
            return;
          }

          if (!body || !Array.isArray(body.features)) {
            sendJson(res, 400, {
              error: "Expected a FeatureCollection with a features array",
            });
            return;
          }

          for (const feature of body.features) {
            const properties = feature?.properties;
            if (
              !properties ||
              typeof properties.german !== "string" ||
              typeof properties.polish !== "string" ||
              typeof properties.exists !== "boolean" ||
              !CATEGORIES.includes(properties.category)
            ) {
              sendJson(res, 400, {
                error:
                  "Every feature needs string german/polish, a boolean exists, and a valid category",
              });
              return;
            }
            if (
              CATEGORIES_WITH_CITY.includes(properties.category) &&
              !CITIES.includes(properties.city)
            ) {
              sendJson(res, 400, {
                error: `"${properties.german}" is a ${properties.category} but has no valid city (Gdańsk/Sopot)`,
              });
              return;
            }
          }

          const output = {
            type: "FeatureCollection",
            features: body.features,
          };
          fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2) + "\n");
          sendJson(res, 200, { ok: true, count: body.features.length });
          return;
        }

        res.statusCode = 405;
        res.end("Method not allowed");
      });
    },
  };
}
