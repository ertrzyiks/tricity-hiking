import { describe, it, expect } from "vitest";
import { orientLineStringsWestToEast } from "./orientLineStringsWestToEast";

const lineFeature = (
  coordinates: [number, number][],
): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates },
});

describe("orientLineStringsWestToEast", () => {
  it("leaves a LineString already running west to east untouched", () => {
    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        lineFeature([
          [10, 0],
          [11, 1],
          [12, 0],
        ]),
      ],
    };

    const result = orientLineStringsWestToEast(collection);

    expect(result.features[0].geometry).toEqual(
      collection.features[0].geometry,
    );
  });

  it("reverses a LineString recorded from east to west", () => {
    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        lineFeature([
          [12, 0],
          [11, 1],
          [10, 0],
        ]),
      ],
    };

    const result = orientLineStringsWestToEast(collection);

    expect(
      (result.features[0].geometry as GeoJSON.LineString).coordinates,
    ).toEqual([
      [10, 0],
      [11, 1],
      [12, 0],
    ]);
  });

  it("leaves non-LineString features untouched", () => {
    const point: GeoJSON.Feature<GeoJSON.Point> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [5, 5] },
    };
    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [point],
    };

    const result = orientLineStringsWestToEast(collection);

    expect(result.features[0]).toEqual(point);
  });

  it("does not mutate the input collection", () => {
    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        lineFeature([
          [12, 0],
          [10, 0],
        ]),
      ],
    };
    const originalCoordinates = (
      collection.features[0].geometry as GeoJSON.LineString
    ).coordinates;

    orientLineStringsWestToEast(collection);

    expect(
      (collection.features[0].geometry as GeoJSON.LineString).coordinates,
    ).toEqual(originalCoordinates);
  });
});
