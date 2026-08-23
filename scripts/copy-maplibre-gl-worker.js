import { createRequire } from "node:module";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);

// maplibre-gl v6 resolves its Web Worker at runtime from a URL built off
// import.meta.url of whichever chunk it ends up bundled into (see
// getWorkerUrl() in maplibre-gl.mjs): `new URL("./maplibre-gl-worker.mjs",
// import.meta.url)`. That's invisible to Rollup's static analysis, so the
// production build never emits maplibre-gl-worker.mjs and the request for
// it 404s - the map never fires "load"/"idle" and stays stuck behind the
// blurred placeholder forever. The worker chunk itself then statically
// imports "./maplibre-gl-shared.mjs", so that sibling has to come along too.
// Copy both next to the built chunks by hand so the runtime URLs resolve.
export const MAPLIBRE_RUNTIME_FILES = [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-shared.mjs",
];

// Exposed for tests so they can point the copy at a fake maplibre-gl/dist
// directory instead of the real installed package.
export function resolveMaplibreDistDir() {
  return path.join(
    path.dirname(require.resolve("maplibre-gl/package.json")),
    "dist",
  );
}

export function copyMaplibreGlWorker({
  getMaplibreDistDir = resolveMaplibreDistDir,
} = {}) {
  let assetsDir = "_astro";
  let outDir = "dist";

  return {
    name: "copy-maplibre-gl-worker",
    apply: "build",
    configResolved(config) {
      assetsDir = config.build.assetsDir;
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const maplibreDistDir = getMaplibreDistDir();
      const destDir = path.join(outDir, assetsDir);
      await mkdir(destDir, { recursive: true });
      await Promise.all(
        MAPLIBRE_RUNTIME_FILES.map((file) =>
          copyFile(path.join(maplibreDistDir, file), path.join(destDir, file)),
        ),
      );
    },
  };
}
