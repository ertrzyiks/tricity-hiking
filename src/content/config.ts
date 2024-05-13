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
    type: z.string(),
    features: z.array(
      z.object({
        type: z.string(),
        properties: z.object({
          name: z.string(),
        }),
        geometry: z.object({
          type: z.string(),
          coordinates: z.union([
            z.array(z.array(z.number())),
            z.array(z.number()),
          ]),
        }),
      })
    ),
  }),
});

export const collections = {
  routes: routesCollection,
  geodata: geodataCollection,
};
