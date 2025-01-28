export const merge = <
  Feature extends {
    geometry: { type: string };
    properties: Record<string, any>;
  },
  GeoData extends { type: string; features: Feature[] },
>(
  data: GeoData[],
): GeoData => {
  let newId = 1;

  return data.reduce((acc, geodata) => {
    acc.type = geodata.type;
    acc.features = acc.features || [];

    const newFeatures = geodata.features.map((feature) => ({
      ...feature,
      id: newId++,
    }));

    const lineString = newFeatures.find(
      (f) => f.geometry.type === "LineString",
    );

    if (lineString) {
      newFeatures.forEach((feature) => {
        if (feature.geometry.type === "Point") {
          feature.properties = {
            ...feature.properties,
            parentFeatureId: lineString.id,
          };
        }
      });
    }

    acc.features = [...acc.features, ...newFeatures];
    return acc;
  }, {} as GeoData);
};
