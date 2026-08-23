import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  copyMaplibreGlWorker,
  MAPLIBRE_RUNTIME_FILES,
} from "./copy-maplibre-gl-worker.js";

// maplibre-gl v6 builds its Web Worker's URL at runtime from
// import.meta.url of whatever chunk it lands in after bundling - a pattern
// Rollup can't see statically, so a production build never emits
// maplibre-gl-worker.mjs on its own. Without it (and the maplibre-gl-shared
// chunk it imports) the map's "load"/"idle" events never fire and the page
// is stuck behind its placeholder forever. This plugin copies both files
// next to the built chunks by hand; these tests pin that behavior down so a
// future refactor of the plugin - or a maplibre-gl upgrade that renames its
// dist files - fails loudly instead of quietly bricking maps in production.

const dirsToClean: string[] = [];

afterEach(async () => {
  await Promise.all(
    dirsToClean
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function makeTempDir(prefix: string) {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  dirsToClean.push(dir);
  return dir;
}

describe("copyMaplibreGlWorker", () => {
  it("copies maplibre-gl's worker and shared chunk into the build's assets dir", async () => {
    const fakeMaplibreDist = await makeTempDir("maplibre-dist-");
    for (const file of MAPLIBRE_RUNTIME_FILES) {
      await writeFile(path.join(fakeMaplibreDist, file), `// fake ${file}`);
    }

    const outDir = await makeTempDir("build-out-");

    const plugin = copyMaplibreGlWorker({
      getMaplibreDistDir: () => fakeMaplibreDist,
    });

    plugin.configResolved({ build: { assetsDir: "_astro", outDir } });
    await plugin.closeBundle();

    for (const file of MAPLIBRE_RUNTIME_FILES) {
      const copied = await readFile(path.join(outDir, "_astro", file), "utf-8");
      expect(copied).toBe(`// fake ${file}`);
    }
  });

  it("respects a custom assetsDir so the copy lands next to the real chunks", async () => {
    const fakeMaplibreDist = await makeTempDir("maplibre-dist-");
    for (const file of MAPLIBRE_RUNTIME_FILES) {
      await writeFile(path.join(fakeMaplibreDist, file), `// fake ${file}`);
    }

    const outDir = await makeTempDir("build-out-");

    const plugin = copyMaplibreGlWorker({
      getMaplibreDistDir: () => fakeMaplibreDist,
    });

    plugin.configResolved({ build: { assetsDir: "assets", outDir } });
    await plugin.closeBundle();

    for (const file of MAPLIBRE_RUNTIME_FILES) {
      await expect(
        readFile(path.join(outDir, "assets", file), "utf-8"),
      ).resolves.toBe(`// fake ${file}`);
    }
  });

  it("only runs during build, not the dev server", () => {
    const plugin = copyMaplibreGlWorker();
    expect(plugin.apply).toBe("build");
  });

  it("copies from the maplibre-gl package actually installed in this repo", async () => {
    const outDir = await makeTempDir("build-out-");
    const plugin = copyMaplibreGlWorker();

    plugin.configResolved({ build: { assetsDir: "_astro", outDir } });
    await plugin.closeBundle();

    for (const file of MAPLIBRE_RUNTIME_FILES) {
      const copied = await readFile(path.join(outDir, "_astro", file));
      // The installed maplibre-gl dist files are minified bundles - a
      // meaningful size check is enough to confirm we copied real content,
      // not an empty or missing file.
      expect(copied.byteLength).toBeGreaterThan(1000);
    }
  });
});
