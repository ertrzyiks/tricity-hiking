import maplibregl, { type LngLatLike } from "maplibre-gl";
export const getBounds = (coordinates: LngLatLike[]) => {
  return coordinates.reduce((bounds, coord) => {
    return bounds.extend(coord);
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
};
