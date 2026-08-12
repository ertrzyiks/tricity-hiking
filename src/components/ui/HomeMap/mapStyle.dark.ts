// Dark counterpart to ./mapStyle.ts for the dark "outdoor gear app" skin
// prototype (issue 06). MapLibre styles bake their own water/land/road
// colors into the style definition, so a page-level CSS filter over the
// canvas isn't enough - this needs a real second style, selected at mount
// time by the same theme state as the rest of the page (see getMapStyle.ts).
export const style =
  import.meta.env.PUBLIC_ASTRO_USE_MAPTILER_MAP_STYLE === "true"
    ? // MapTiler's own dark basemap in their standard style catalog, reusing
      // the same key as the light style. NOTE: this key is domain-restricted
      // so it couldn't be verified against the live style endpoint from this
      // sandbox - confirm the "dataviz-dark" style id resolves for this key
      // before treating this as production-ready.
      "https://api.maptiler.com/maps/dataviz-dark/style.json?key=bHa0L2mKhjZqOJctPuVf"
    : // The light fallback (mapStyle.ts) is a single raster OSM tile layer,
      // not a vector style with separate land/water layers, so there's
      // nothing to invert the luminance of. The real dark counterpart here
      // is swapping to CARTO's dark raster tile server instead - a
      // different tile source with its own baked-in dark colors, which is
      // what actually matters (not a CSS filter over the light tiles).
      {
        version: 8 as const,
        sources: {
          "carto-dark": {
            type: "raster" as const,
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap Contributors &copy; CARTO",
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: "carto-dark" as const,
            type: "raster" as const,
            source: "carto-dark" as const,
          },
        ],
      };

export { glyphs } from "./mapStyle";
