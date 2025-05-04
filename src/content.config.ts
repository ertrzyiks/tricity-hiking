import { z, reference, defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const routesCollection = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/routes" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      geojson: reference("geodata"),
      description: z.string(),
      tricity: z.boolean().optional(),
      draft: z.boolean().optional(),
      preview: image().optional(),
    }),
});

const geodataCollection = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/geodata" }),
  schema: z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        properties: z.record(z.any()),
        geometry: z.union([
          z.object({
            type: z.literal("LineString"),
            coordinates: z.union([
              z.array(z.tuple([z.number(), z.number()])),
              z.array(z.tuple([z.number(), z.number(), z.number()])),
            ]),
          }),
          z.object({
            type: z.literal("Point"),
            coordinates: z.union([
              z.tuple([z.number(), z.number()]),
              z.tuple([z.number(), z.number(), z.number()]),
            ]),
          }),
        ]),
      }),
    ),
  }),
});

const mapTilesCollection = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/map-tiles" }),
  schema: z.object({
    urls: z.array(z.string()),
  }),
});

export const collections = {
  routes: routesCollection,
  geodata: geodataCollection,
  "map-tiles": mapTilesCollection,
};
