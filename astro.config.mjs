import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";

import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";

import favicons from "astro-favicons";

import { copyMaplibreGlWorker } from "./scripts/copy-maplibre-gl-worker.js";

// https://astro.build/config
export default defineConfig({
  site: "https://tricity-hiking.ertrzyiks.me",
  server: {
    host: "0.0.0.0",
  },
  integrations: [
    mdx(),
    preact(),
    icon(),
    sitemap(),
    favicons({
      name: "Tricity Hiking",
      short_name: "Tricity Hiking",
      icons: {
        android: ["android-chrome-192x192.png", "android-chrome-512x512.png"],
        appleIcon: [
          "apple-touch-icon.png",
          "apple-touch-icon-precomposed.png",
          "safari-pinned-tab.svg",
        ],
        appleStartup: false,
        favicons: true,
        windows: true,
        yandex: true,
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss(), copyMaplibreGlWorker()],
    server: {
      allowedHosts: ["9745f00829df.ngrok-free.app"],
    },
    optimizeDeps: {
      // maplibre-gl v6 spins up its worker as a real ES module, resolved at
      // runtime relative to import.meta.url of its own bundle (see
      // getWorkerUrl() in maplibre-gl.mjs). Vite's dependency pre-bundling
      // rewrites that URL to point into node_modules/.vite/deps, but only
      // copies the entry file there - not the sibling maplibre-gl-worker.mjs
      // chunk - so the worker request 404s and the map never loads in dev.
      // Excluding the package from pre-bundling serves it straight from
      // node_modules, where the worker file sits right next to it.
      exclude: ["maplibre-gl"],
    },
    build: {
      // maplibre-gl is already isolated into its own lazily-loaded chunk
      // (only fetched once a map actually mounts), so its ~1MB minified
      // size doesn't affect initial page weight. Raise the limit past that
      // known, unavoidable chunk instead of silencing genuine regressions.
      chunkSizeWarningLimit: 1100,
    },
  },
});
