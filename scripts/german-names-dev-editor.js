import fs from "node:fs";

const DATA_PATH = "./src/content/german_names/names.json";
const CATEGORIES = ["street name", "district name", "locality name"];
const CITIES = ["Gdańsk", "Sopot"];
const ROUTE = "/api/german-names";

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
      server.middlewares.use(ROUTE, async (req, res) => {
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
              properties.category === "street name" &&
              !CITIES.includes(properties.city)
            ) {
              sendJson(res, 400, {
                error: `"${properties.german}" is a street but has no valid city (Gdańsk/Sopot)`,
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
