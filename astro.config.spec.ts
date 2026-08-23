import { describe, it, expect } from "vitest";
import config from "./astro.config.mjs";

// Guards the two config-level fixes that keep maplibre-gl v6's map loading
// after https://github.com/maplibre/maplibre-gl-js bumped it to a
// worker-as-real-ES-module build:
//
// - dev: Vite's dependency pre-bundling drops maplibre-gl's sibling worker
//   file, 404-ing every map in `astro dev` unless the package is excluded
//   from pre-bundling (see optimizeDeps.exclude below).
// - build: Rollup can't see the runtime-constructed worker URL either, so
//   without copy-maplibre-gl-worker.js the production build never emits
//   maplibre-gl-worker.mjs and maps hang behind their placeholder forever.
//
// copy-maplibre-gl-worker.spec.ts covers what the plugin actually copies;
// this test only pins down that both fixes stay wired into the real config.

describe("astro.config vite settings", () => {
  it("excludes maplibre-gl from dev dependency pre-bundling", () => {
    expect(config.vite?.optimizeDeps?.exclude).toContain("maplibre-gl");
  });

  it("registers the plugin that copies maplibre-gl's worker into the build output", () => {
    const pluginNames = config.vite?.plugins?.map((plugin) =>
      plugin && typeof plugin === "object" && "name" in plugin
        ? plugin.name
        : undefined,
    );

    expect(pluginNames).toContain("copy-maplibre-gl-worker");
  });
});
