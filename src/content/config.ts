import { z, reference, defineCollection } from "astro:content";

const routesCollection = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      geojson: reference("geodata"),
      description: z.string(),
      tricity: z.boolean().optional(),
      preview: image().optional(),
    }),
});

const geodataCollection = defineCollection({
  type: "data",
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
      })
    ),
  }),
});

export const collections = {
  routes: routesCollection,
  geodata: geodataCollection,
};
