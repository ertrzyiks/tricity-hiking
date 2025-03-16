import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import mdx from "@astrojs/mdx";

import icon from "astro-icon";

import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://ertrzyiks.github.io",
  base: "tricity-hiking",
  integrations: [mdx(), preact(), icon(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
});