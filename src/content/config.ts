import { z, reference, defineCollection } from "astro:content";
const routesCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    geojson: reference("geodata"),
  }),
});

const geodataCollection = defineCollection({
  type: "data",
  schema: z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        properties: z.object({
          name: z.string(),
        }),
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
      })
    ),
  }),
});

export const collections = {
  routes: routesCollection,
  geodata: geodataCollection,
};
