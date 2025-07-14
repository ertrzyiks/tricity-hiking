import { describe, it, expect } from "vitest";
import fs from "fs";
import { getRouteStats } from "./get-route-stats.js";

const data = JSON.parse(
  fs.readFileSync(
    "./src/content/routes/gora-markowca/gora-markowca.json",
    "utf-8",
  ),
);

describe("getRouteStats", () => {
  it("should return the correct stats for a route", () => {
    const coords = [
      [0, 0, 1],
      [0, 0, 2],
      [0, 0, 3],
    ];

    const stats = getRouteStats(coords);

    expect(stats).toEqual({
      distance: 0,
      totalGain: 2,
      totalLoss: 0,
    });
  });

  it.only("should return correct stats for gora markowca", () => {
    const stats = getRouteStats(data.features[0].geometry.coordinates);

    expect(stats.distance).toBeCloseTo(3596.1, 1);
    expect(stats.totalGain).toBeCloseTo(143.5, 1);
    expect(stats.totalLoss).toBeCloseTo(143.5, 1);
  });
});
