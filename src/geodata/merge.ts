export const merge = <
  Feature,
  GeoData extends { type: string; features: Feature[] }
>(
  data: GeoData[]
): GeoData => {
  return data.reduce((acc, geodata) => {
    acc.type = geodata.type;
    acc.features = acc.features || [];

    const newFeatures = geodata.features.map((feature) => ({
      ...feature,
      id: acc.features.length,
    }));

    acc.features = [...acc.features, ...newFeatures];
    return acc;
  }, {} as GeoData);
};
