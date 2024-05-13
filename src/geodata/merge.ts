export const merge = <
  Feature,
  GeoData extends { type: string; features: Feature[] }
>(
  data: GeoData[]
): GeoData => {
  return data.reduce((acc, geodata) => {
    console.log
    acc.type = geodata.type;
    acc.features = acc.features || [];
    acc.features = [...acc.features, ...geodata.features];
    return acc;
  }, {} as GeoData);
};
