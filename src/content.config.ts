import { z, reference, defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";

const routesCollection = defineCollection({
  loader: glob({
    pattern: "**/*.mdx",
    base: "./src/content/routes",
    generateId: (options) => {
      const segments = options.entry.split("/");
      segments.shift();

      return segments.join("/").replace(/\.mdx$/, "");
    },
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      geojson: reference("geodata"),
      description: z.string(),
      htmlDescription: z.string().optional(),
      tricity: z.boolean().optional(),
      featured: z.literal("homepage").optional(),
      draft: z.boolean().optional(),
      preview: image().optional(),
    }),
});

const geodataCollection = defineCollection({
  loader: glob({
    pattern: ["routes/**/*.json", "transportation/**/*.json"],
    base: "./src/content",
    generateId: (options) => {
      const segments = options.entry.split("/");

      if (segments[0] === "routes") {
        return segments[1];
      }

      return segments.join("/").replace(/\.json$/, "");
    },
  }),
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

const activitiesCollection = defineCollection({
  loader: file("src/content/activities.json", {
    parser: (text) => {
      const data = JSON.parse(text);

      return Object.entries(data).flatMap(([key, value]) => {
        if (!Array.isArray(value)) {
          throw new Error(`Invalid data format for key: ${key}`);
        }

        return value.map((item) => ({
          id: `${key}-${item.name}`,
          ...item,
          type: key,
        }));
      });
    },
  }),
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      type: z.string(),
      name: z.string(),
      description: z.string(),
      image: image().optional(),
      link: z.string(),
      location: z.string().optional(),
    }),
});

export const collections = {
  routes: routesCollection,
  geodata: geodataCollection,
  activities: activitiesCollection,
  "map-tiles": mapTilesCollection,
};
