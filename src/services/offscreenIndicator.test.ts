import { describe, it, expect } from "vitest";
import { LngLatBounds, type LngLat, type Map } from "maplibre-gl";
import { computeOffscreenIndicators } from "./offscreenIndicator";

// A small stand-in for maplibregl.Map: a simple equirectangular projection
// over a fixed viewport, so pixel math in the assertions stays exact.
const WIDTH = 400;
const HEIGHT = 300;
const VIEW = { west: 0, east: 10, south: 0, north: 10 };

const createFakeMap = () => {
  const viewBounds = new LngLatBounds(
    [VIEW.west, VIEW.south],
    [VIEW.east, VIEW.north],
  );

  return {
    getBounds: () => viewBounds,
    getContainer: () =>
      ({ clientWidth: WIDTH, clientHeight: HEIGHT }) as HTMLElement,
    project: ({ lng, lat }: LngLat) => ({
      x: ((lng - VIEW.west) / (VIEW.east - VIEW.west)) * WIDTH,
      y: ((VIEW.north - lat) / (VIEW.north - VIEW.south)) * HEIGHT,
    }),
  } as unknown as Map;
};

describe("computeOffscreenIndicators", () => {
  it("returns nothing for a target that intersects the viewport", () => {
    const map = createFakeMap();
    const bounds = new LngLatBounds([5, 5], [7, 7]);

    expect(computeOffscreenIndicators(map, [{ id: "a", bounds }])).toEqual([]);
  });

  it("points straight up and sits on the top edge for a target due north", () => {
    const map = createFakeMap();
    const bounds = new LngLatBounds([4, 12], [6, 14]);

    const [indicator] = computeOffscreenIndicators(map, [{ id: "a", bounds }]);

    expect(indicator.angle).toBeCloseTo(0, 5);
    expect(indicator.x).toBeCloseTo(WIDTH / 2, 5);
    expect(indicator.y).toBeCloseTo(28, 5); // EDGE_INSET
  });

  it("points right and sits on the right edge for a target due east", () => {
    const map = createFakeMap();
    const bounds = new LngLatBounds([12, 4], [14, 6]);

    const [indicator] = computeOffscreenIndicators(map, [{ id: "a", bounds }]);

    expect(indicator.angle).toBeCloseTo(90, 5);
    expect(indicator.x).toBeCloseTo(WIDTH - 28, 5); // EDGE_INSET
    expect(indicator.y).toBeCloseTo(HEIGHT / 2, 5);
  });

  it("carries the label through and skips only the off-screen targets", () => {
    const map = createFakeMap();
    const onscreen = new LngLatBounds([5, 5], [7, 7]);
    const offscreen = new LngLatBounds([12, 4], [14, 6]);

    const indicators = computeOffscreenIndicators(map, [
      { id: "visible", bounds: onscreen },
      { id: "hidden", bounds: offscreen, label: "3" },
    ]);

    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toMatchObject({ id: "hidden", label: "3" });
  });
});
