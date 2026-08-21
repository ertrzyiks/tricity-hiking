import { getCollection, getEntry } from "astro:content";
import { enhance } from "../services/enhance";
import { getLineStringFeature } from "../services/getLineStringFeature";
import { mToKm } from "../services/mToKm";
import type { SearchItem } from "../services/searchIndex";
import foodPlaces from "../content/food.json";

export const prerender = true;

// Command palette search index (prototype for issue #5, command-palette-nav).
// Built once at build time from the same three sources the rest of the site
// reads from — the `routes` and `activities` content collections, plus the
// food place list extracted to src/content/food.json — so the palette never
// duplicates data, only re-shapes it for search.
export async function GET() {
  const allRoutes = await getCollection("routes", ({ data }) => !data.draft);

  const routeItems: SearchItem[] = await Promise.all(
    allRoutes.map(async (route) => {
      const geojson = await getEntry(route.data.geojson);
      const enhancedGeojson = enhance({
        collection: geojson.data,
        route: route.data,
      });
      const properties =
        getLineStringFeature({ collection: enhancedGeojson })?.properties ?? {};

      return {
        type: "route",
        title: route.data.title,
        description: route.data.description,
        distance:
          typeof properties.distance === "number"
            ? `${mToKm(properties.distance).toFixed(2)} km`
            : null,
        href: `/routes/${route.id}/`,
      };
    }),
  );

  const allActivities = await getCollection(
    "activities",
    ({ data }) => !data.draft,
  );

  const activityItems: SearchItem[] = allActivities.map((activity) => ({
    type: "activity",
    title: activity.data.title,
    category: activity.data.category,
    href: activity.data.link,
  }));

  const foodItems: SearchItem[] = foodPlaces.map((place) => ({
    type: "food",
    title: place.name,
    kind: place.kind,
    location: place.location,
    href: place.link,
  }));

  const index: SearchItem[] = [...routeItems, ...activityItems, ...foodItems];

  return new Response(JSON.stringify(index), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
