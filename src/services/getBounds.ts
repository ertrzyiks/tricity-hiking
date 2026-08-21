import { LngLatBounds, type LngLatLike } from "maplibre-gl";
export const getBounds = (coordinates: LngLatLike[]) => {
  return coordinates.reduce(
    (bounds, coord) => {
      return bounds.extend(coord);
    },
    new LngLatBounds(coordinates[0], coordinates[0]),
  );
};
