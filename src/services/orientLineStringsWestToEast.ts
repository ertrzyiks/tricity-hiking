// Reorders each LineString's coordinates so they run west to east
// (ascending longitude), regardless of which end the trail happened to be
// recorded/drawn from. The trail line layers colour themselves along
// ["line-progress"] (0 -> 1 following the coordinate order), so without
// this a "line-gradient" would follow whichever end was the recorded
// start point instead of consistently reading left-to-right on screen.
export const orientLineStringsWestToEast = (
  collection: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection => {
  return {
    ...collection,
    features: collection.features.map((feature) => {
      if (feature.geometry.type !== "LineString") return feature;

      const coordinates = feature.geometry.coordinates;
      if (coordinates.length < 2) return feature;

      const firstLng = coordinates[0][0];
      const lastLng = coordinates[coordinates.length - 1][0];

      if (firstLng <= lastLng) return feature;

      return {
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: [...coordinates].reverse(),
        },
      };
    }),
  };
};
