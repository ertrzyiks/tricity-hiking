export const getLineStringFeature = <
  Feature extends {
    geometry: { type: string };
    properties: Record<string, any>;
  },
  FeatureCollection extends { features: Feature[] },
>({
  collection,
}: {
  collection: FeatureCollection;
}) => {
  return collection.features.find(
    (feature) => feature.geometry.type === "LineString",
  );
};
