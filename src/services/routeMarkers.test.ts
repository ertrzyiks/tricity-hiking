import { describe, it, expect } from "vitest";
import {
  calculateBearing,
  calculateDistance,
  calculateSmartStartBearing,
  getStartPointWithDirection,
  getEndPointWithDirection,
  isRouteLoop,
  generateTriangleSVG,
  generatePerpendicularLineSVG,
  generateLoopMarkerSVG,
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

  describe("calculateSmartStartBearing", () => {
    it("should use the first point that meets distance threshold", () => {
      // Create a route that goes east for a significant distance
      const coordinates: [number, number, number?][] = [
        [0, 0, 100], // start
        [0.0001, 0, 110], // 11m east - too short
        [0.0005, 0, 120], // 56m east - still short for 75m threshold
        [0.001, 0, 130], // 111m east - meets threshold
        [0.002, 0, 140], // 222m east
        [0.005, 0, 150], // further points...
      ];

      const bearing = calculateSmartStartBearing(coordinates, 75);

      // Should use the bearing to point at index 3 (0.001, 0) which is ~111m away
      expect(bearing).toBeCloseTo(90, 1); // eastward
    });

    it("should use farthest available point when threshold is not met", () => {
      // Short route where no point meets the 75m threshold
      const coordinates: [number, number, number?][] = [
        [0, 0, 100], // start
        [0.0001, 0, 110], // 11m east
        [0.0002, 0, 120], // 22m east
        [0.0003, 0, 130], // 33m east - farthest available
      ];

      const bearing = calculateSmartStartBearing(coordinates, 75);

      // Should use the farthest point (index 3)
      expect(bearing).toBeCloseTo(90, 1); // eastward
    });

    it("should handle routes with direction changes", () => {
      // Route that starts south then turns east
      const coordinates: [number, number, number?][] = [
        [0, 0, 100], // start
        [0, -0.0001, 110], // 11m south - small initial movement
        [0, -0.0002, 120], // 22m south
        [0.001, -0.0002, 130], // then 111m east - should use this bearing
        [0.002, -0.0002, 140], // continues east
      ];

      const bearing = calculateSmartStartBearing(coordinates, 75);

      // Should use bearing from start to the point that meets threshold
      // This will be primarily eastward bearing (close to 90°)
      expect(bearing).toBeGreaterThan(80);
      expect(bearing).toBeLessThan(110);
    });

    it("should respect suggested indices [1, 2, 3, 5, 8, 13]", () => {
      // Create a route where index 4 would meet threshold but it's not in suggested indices
      const coordinates: [number, number, number?][] = new Array(15)
        .fill(null)
        .map((_, i) => [i * 0.0001, 0, 100 + i * 10]) as [
        number,
        number,
        number?,
      ][];

      // Manually set index 5 to be far enough to meet 75m threshold
      coordinates[5] = [0.001, 0, 150]; // ~111m from start

      const bearing = calculateSmartStartBearing(coordinates, 75);

      // Should use index 5 (first suggested index that meets threshold)
      expect(bearing).toBeCloseTo(90, 1); // eastward
    });

    it("should fallback to index 1 for very short routes", () => {
      const coordinates: [number, number, number?][] = [
        [0, 0, 100],
        [0.0001, 0, 110], // ~11m east
      ];

      const bearing = calculateSmartStartBearing(coordinates, 75);
      expect(bearing).toBeCloseTo(90, 1); // eastward
    });

    it("should throw error for insufficient coordinates", () => {
      const coordinates: [number, number, number?][] = [[0, 0, 100]];

      expect(() => calculateSmartStartBearing(coordinates)).toThrow(
        "Need at least 2 coordinates",
      );
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

  describe("calculateDistance", () => {
    it("should calculate distance correctly", () => {
      // Same point
      const samePoint = calculateDistance([0, 0], [0, 0]);
      expect(samePoint).toBeCloseTo(0, 1);

      // Short distance (approximately 111km for 1 degree at equator)
      const oneDegree = calculateDistance([0, 0], [1, 0]);
      expect(oneDegree).toBeGreaterThan(100000); // > 100km
      expect(oneDegree).toBeLessThan(120000); // < 120km
    });
  });

  describe("isRouteLoop", () => {
    it("should detect loops when start and end are close", () => {
      const loopFeature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0, 100],
            [0.001, 0, 110],
            [0.001, 0.001, 120],
            [0, 0.001, 130],
            [0, 0, 140], // close to start
          ],
        },
      };

      const result = isRouteLoop(loopFeature);
      expect(result).toBe(true);
    });

    it("should not detect loops when start and end are far apart", () => {
      const linearFeature: GeoJSON.Feature = {
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

      const result = isRouteLoop(linearFeature);
      expect(result).toBe(false);
    });

    it("should return false for non-LineString geometries", () => {
      const pointFeature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      };

      const result = isRouteLoop(pointFeature);
      expect(result).toBe(false);
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

  describe("generateLoopMarkerSVG", () => {
    it("should generate a valid SVG data URL for loop markers with both triangle and line", () => {
      const svg = generateLoopMarkerSVG(16, "#7c3aed");
      expect(svg).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
      const decodedSvg = decodeURIComponent(svg);
      expect(decodedSvg).toContain("<svg");
      expect(decodedSvg).toContain("polygon"); // triangle element
      expect(decodedSvg).toContain("line"); // line element
      expect(decodedSvg).toContain("#7c3aed");
    });
  });

  describe("createRouteMarkersData", () => {
    it("should create start and end markers for linear routes", () => {
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

      const { startMarkers, endMarkers, loopMarkers } =
        createRouteMarkersData(routes);

      expect(startMarkers.features).toHaveLength(2);
      expect(endMarkers.features).toHaveLength(2);
      expect(loopMarkers.features).toHaveLength(0);

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
      expect(endMarkers.features[0].properties?.bearing).toBeCloseTo(90, 1); // perpendicular achieved by vertical base + trail bearing
    });

    it("should create loop markers for circular routes", () => {
      const routes: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Loop Route" },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0, 100],
                [0.001, 0, 110],
                [0.001, 0.001, 120],
                [0, 0.001, 130],
                [0, 0, 140], // close to start (forms a loop)
              ],
            },
          },
          {
            type: "Feature",
            properties: { name: "Linear Route" },
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

      const { startMarkers, endMarkers, loopMarkers } =
        createRouteMarkersData(routes);

      expect(startMarkers.features).toHaveLength(1); // only linear route
      expect(endMarkers.features).toHaveLength(1); // only linear route
      expect(loopMarkers.features).toHaveLength(1); // only loop route

      // Check loop marker
      expect(
        (loopMarkers.features[0].geometry as GeoJSON.Point).coordinates,
      ).toEqual([0, 0]);
      expect(loopMarkers.features[0].properties?.index).toBe(0);
      expect(loopMarkers.features[0].properties?.routeName).toBe("Loop Route");
    });
  });
});
