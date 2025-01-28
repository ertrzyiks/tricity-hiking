export const enhance = <
  Feature extends {
    geometry: { type: string };
    properties: Record<string, any>;
  },
  FeatureCollection extends { features: Feature[] },
>({
  collection,
  route,
}: {
  collection: FeatureCollection;
  route: { description: string };
}) => {
  return {
    ...collection,
    features: collection.features.map((feature) => {
      if (feature.geometry.type !== "LineString") {
        return feature;
      }
      return {
        ...feature,
        properties: {
          ...feature.properties,
          description: route.description,
        },
      };
    }),
  };
};
