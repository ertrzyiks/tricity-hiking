import { describe, it, expect } from "vitest";
import {
  calculateBearing,
  getStartPointWithDirection,
  getEndPointWithDirection,
  generateTriangleSVG,
  generatePerpendicularLineSVG,
  createRouteMarkersData,
} from "./routeMarkers";

describe("routeMarkers", () => {
  describe("calculateBearing", () => {
    it("should calculate bearing correctly", () => {
      // North
      const northBearing = calculateBearing([0, 0], [0, 1]);
      expect(northBearing).toBeCloseTo(0, 1);

      // East
      const eastBearing = calculateBearing([0, 0], [1, 0]);
      expect(eastBearing).toBeCloseTo(90, 1);

      // South
      const southBearing = calculateBearing([0, 1], [0, 0]);
      expect(southBearing).toBeCloseTo(180, 1);

      // West
      const westBearing = calculateBearing([1, 0], [0, 0]);
      expect(westBearing).toBeCloseTo(270, 1);
    });
  });

  describe("getStartPointWithDirection", () => {
    it("should return start point and bearing for LineString", () => {
      const feature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0, 100],
            [1, 0, 110],
            [2, 0, 120],
          ],
        },
      };

      const result = getStartPointWithDirection(feature);
      expect(result).toBeDefined();
      expect(result?.point).toEqual([0, 0]);
      expect(result?.bearing).toBeCloseTo(90, 1); // eastward
    });

    it("should return null for non-LineString geometries", () => {
      const feature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      };

      const result = getStartPointWithDirection(feature);
      expect(result).toBeNull();
    });
  });

  describe("getEndPointWithDirection", () => {
    it("should return end point and bearing for LineString", () => {
      const feature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0, 100],
            [1, 0, 110],
            [2, 0, 120],
          ],
        },
      };

      const result = getEndPointWithDirection(feature);
      expect(result).toBeDefined();
      expect(result?.point).toEqual([2, 0]);
      expect(result?.bearing).toBeCloseTo(90, 1); // eastward
    });
  });

  describe("generateTriangleSVG", () => {
    it("should generate a valid SVG data URL", () => {
      const svg = generateTriangleSVG(16, "#ff0000");
      expect(svg).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
      expect(decodeURIComponent(svg)).toContain("<svg");
      expect(decodeURIComponent(svg)).toContain("polygon");
      expect(decodeURIComponent(svg)).toContain("#ff0000");
    });
  });

  describe("generatePerpendicularLineSVG", () => {
    it("should generate a valid SVG data URL", () => {
      const svg = generatePerpendicularLineSVG(16, "#00ff00");
      expect(svg).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
      expect(decodeURIComponent(svg)).toContain("<svg");
      expect(decodeURIComponent(svg)).toContain("<line");
      expect(decodeURIComponent(svg)).toContain("#00ff00");
    });
  });

  describe("createRouteMarkersData", () => {
    it("should create start and end markers for route collection", () => {
      const routes: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Route 1" },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0, 100],
                [1, 0, 110],
                [2, 0, 120],
              ],
            },
          },
          {
            type: "Feature",
            properties: { name: "Route 2" },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 1, 100],
                [0, 2, 110],
              ],
            },
          },
        ],
      };

      const { startMarkers, endMarkers } = createRouteMarkersData(routes);

      expect(startMarkers.features).toHaveLength(2);
      expect(endMarkers.features).toHaveLength(2);

      // Check first start marker
      expect(
        (startMarkers.features[0].geometry as GeoJSON.Point).coordinates,
      ).toEqual([0, 0]);
      expect(startMarkers.features[0].properties?.index).toBe(0);
      expect(startMarkers.features[0].properties?.bearing).toBeCloseTo(90, 1);

      // Check first end marker
      expect(
        (endMarkers.features[0].geometry as GeoJSON.Point).coordinates,
      ).toEqual([2, 0]);
      expect(endMarkers.features[0].properties?.index).toBe(0);
      expect(endMarkers.features[0].properties?.bearing).toBeCloseTo(180, 1); // perpendicular to eastward (90° + 90° = 180°)
    });
  });
});
