import { getCollection, getEntry } from "astro:content";
import { merge } from "./merge";
import { enhance } from "./enhance";
import { getLineStringFeature } from "./getLineStringFeature";
import { mToKm } from "./mToKm";
import { formatTime } from "./formatTime";

export interface RoutesPrototypeListItem {
  id: string;
  title: string;
  description: string;
  preview: ImageMetadata | undefined;
  distanceLabel: string;
  timeLabel: string;
  gainLabel: string;
  lossLabel: string;
}

async function buildListItems(
  routes: Awaited<ReturnType<typeof getCollection<"routes">>>,
) {
  const items: RoutesPrototypeListItem[] = [];
  const geojsonFeatures = [];

  for (const route of routes) {
    const geojsonEntry = await getEntry(route.data.geojson);

    if (!geojsonEntry) {
      continue;
    }

    const enhancedGeojson = enhance({
      collection: geojsonEntry.data,
      route: route.data,
    });

    const feature = getLineStringFeature({ collection: enhancedGeojson });
    const properties = feature?.properties ?? {};

    items.push({
      id: route.id,
      title: route.data.title,
      description: route.data.description,
      preview: route.data.preview,
      distanceLabel: `${mToKm(properties.distance ?? 0).toFixed(2)}km`,
      timeLabel: formatTime(properties.estimatedTime ?? 0),
      gainLabel: `${(properties.totalGain ?? 0).toFixed(0)}m`,
      lossLabel: `${(properties.totalLoss ?? 0).toFixed(0)}m`,
    });

    geojsonFeatures.push(enhancedGeojson);
  }

  return { items, geojsonFeatures };
}

/**
 * Shared data loader for the /routes navigation prototypes.
 *
 * Mirrors the fetching done by routes.astro, list.astro and nearby.astro,
 * but returns plain data (no Astro components), so it can be reused as-is
 * across the /routes1 .. /routes5 prototype pages.
 */
export async function getRoutesPrototypeData() {
  const allRoutes = await getCollection("routes");
  const routes = allRoutes.filter((route) => !route.data.draft);

  const tricityRoutes = routes.filter((route) => route.data.tricity);
  const nearbyRoutes = routes.filter((route) => !route.data.tricity);

  const [tricityResult, nearbyResult] = await Promise.all([
    buildListItems(tricityRoutes),
    buildListItems(nearbyRoutes),
  ]);

  const mapGeojson = merge(tricityResult.geojsonFeatures);

  return {
    tricityItems: tricityResult.items,
    nearbyItems: nearbyResult.items,
    mapGeojson,
  };
}
