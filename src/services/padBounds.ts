import { LngLatBounds } from "maplibre-gl";

const KM_PER_DEGREE_LAT = 111.32;

// Pads a bounding box for use as maxBounds: `paddingRatio` adds a fraction
// of the box's own width/height on each side, `extraKm` then adds a flat
// buffer on top, converted to degrees using the box's own latitude (since
// a degree of longitude shrinks the further you are from the equator).
export const padBounds = (
  bounds: LngLatBounds,
  { paddingRatio = 0, extraKm = 0 } = {},
) => {
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();

  const ratioLngPadding = (east - west) * paddingRatio;
  const ratioLatPadding = (north - south) * paddingRatio;

  const centerLat = (north + south) / 2;
  const kmPerDegreeLng =
    KM_PER_DEGREE_LAT * Math.cos((centerLat * Math.PI) / 180);

  const extraLatPadding = extraKm / KM_PER_DEGREE_LAT;
  const extraLngPadding = extraKm / kmPerDegreeLng;

  return new LngLatBounds(
    [
      west - ratioLngPadding - extraLngPadding,
      south - ratioLatPadding - extraLatPadding,
    ],
    [
      east + ratioLngPadding + extraLngPadding,
      north + ratioLatPadding + extraLatPadding,
    ],
  );
};
