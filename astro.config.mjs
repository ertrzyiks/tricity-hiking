import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import mdx from "@astrojs/mdx";

import icon from "astro-icon";

import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";

import favicons from "astro-favicons";

// https://astro.build/config
export default defineConfig({
  site: "https://tricity-hiking.ertrzyiks.me",
  integrations: [
    mdx(),
    preact(),
    icon(),
    sitemap(),
    favicons({
      name: "Tricity Hiking",
      short_name: "Tricity Hiking",
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
