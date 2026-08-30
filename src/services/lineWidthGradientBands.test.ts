import { describe, it, expect } from "vitest";
import {
  interpolateHexColor,
  scaleLineExpression,
  buildWidthGradientBands,
} from "./lineWidthGradientBands";

describe("interpolateHexColor", () => {
  it("returns the start colour at t=0", () => {
    expect(interpolateHexColor("#c53c00", "#f05100", 0)).toBe("#c53c00");
  });

  it("returns the end colour at t=1", () => {
    expect(interpolateHexColor("#c53c00", "#f05100", 1)).toBe("#f05100");
  });

  it("returns the midpoint colour at t=0.5", () => {
    expect(interpolateHexColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("scaleLineExpression", () => {
  it("scales a bare number directly", () => {
    expect(scaleLineExpression(10, 0.5)).toBe(5);
  });

  it("scales each stop value of an interpolate-on-zoom expression, not the whole thing", () => {
    const expression = ["interpolate", ["linear"], ["zoom"], 9, 2, 15, 4];

    expect(scaleLineExpression(expression, 0.5)).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      9,
      1,
      15,
      2,
    ]);
  });

  it("never wraps a zoom reference in another expression (invalid MapLibre style)", () => {
    const expression = ["interpolate", ["linear"], ["zoom"], 9, 2, 15, 4];
    const scaled = scaleLineExpression(expression, 0.5);

    // A valid scaled result keeps ["zoom"] only as interpolate's direct
    // input (index 2) - never nested one level deeper inside a "*".
    expect(scaled[0]).toBe("interpolate");
    expect(scaled[2]).toEqual(["zoom"]);
    expect(JSON.stringify(scaled)).not.toContain('["*"');
  });

  it("reaches through a case expression nested inside an interpolate stop", () => {
    const hoverCase = [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      3,
      2,
    ];
    const expression = [
      "interpolate",
      ["linear"],
      ["zoom"],
      9,
      hoverCase,
      15,
      ["case", ["boolean", ["feature-state", "hover"], false], 6, 4],
    ];

    expect(scaleLineExpression(expression, 2)).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      9,
      ["case", ["boolean", ["feature-state", "hover"], false], 6, 4],
      15,
      ["case", ["boolean", ["feature-state", "hover"], false], 12, 8],
    ]);
  });

  it("wraps any other expression in a multiply, since it can't itself reference zoom", () => {
    const expression = ["get", "someWidth"];

    expect(scaleLineExpression(expression, 3)).toEqual([
      "*",
      3,
      ["get", "someWidth"],
    ]);
  });
});

describe("buildWidthGradientBands", () => {
  it("colours the first and last band from the given endpoints", () => {
    const bands = buildWidthGradientBands(10, ["#c53c00", "#f05100"], 5);

    expect(bands[0].color).toBe("#c53c00");
    expect(bands[4].color).toBe("#f05100");
  });

  it("orders band colours as a monotonic interpolation between endpoints", () => {
    const bands = buildWidthGradientBands(10, ["#000000", "#ffffff"], 5);

    expect(bands.map((band) => band.color)).toEqual([
      "#000000",
      "#404040",
      "#808080",
      "#bfbfbf",
      "#ffffff",
    ]);
  });

  it("centers offsets symmetrically around the line, zero for an odd middle band", () => {
    const bands = buildWidthGradientBands(10, ["#000000", "#ffffff"], 5);

    expect(bands[2].offset).toBe(0);
    expect(bands[0].offset).toBe(-4);
    expect(bands[4].offset).toBe(4);
    expect(bands[1].offset).toBe(-2);
    expect(bands[3].offset).toBe(2);
  });

  it("widens each band slightly past an exact 1/N split to avoid seams", () => {
    const bands = buildWidthGradientBands(10, ["#000000", "#ffffff"], 4);

    for (const band of bands) {
      expect(band.width).toBeGreaterThan(10 / 4);
      expect(band.width).toBeCloseTo(10 * (1 / 4) * 1.15, 5);
    }
  });

  it("wraps a zoom-based width expression without nesting zoom inside another expression", () => {
    const widthExpression = ["interpolate", ["linear"], ["zoom"], 9, 2, 15, 4];

    const bands = buildWidthGradientBands(
      widthExpression,
      ["#000000", "#ffffff"],
      3,
    );

    for (const band of bands) {
      expect(Array.isArray(band.width)).toBe(true);
      expect(band.width[0]).toBe("interpolate");
      expect(band.width[2]).toEqual(["zoom"]);
      expect(JSON.stringify(band.width)).not.toContain('["*"');
    }
    // Middle band of an odd count sits exactly on the centreline.
    expect(bands[1].offset).toBe(0);
    expect(bands[0].offset[0]).toBe("interpolate");
    expect(bands[2].offset[0]).toBe("interpolate");
  });

  it("collapses to a single band using the start colour when bandCount is 1", () => {
    const bands = buildWidthGradientBands(10, ["#c53c00", "#f05100"], 1);

    expect(bands).toHaveLength(1);
    expect(bands[0].color).toBe("#c53c00");
    expect(bands[0].offset).toBe(0);
  });

  it("throws for a bandCount below 1", () => {
    expect(() =>
      buildWidthGradientBands(10, ["#000000", "#ffffff"], 0),
    ).toThrow();
  });
});
