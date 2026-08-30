// MapLibre's `line-gradient` paint property only colours along
// ["line-progress"] - the line's length - there's no built-in way to run a
// gradient across a line's *width*. This fakes one by stacking several
// thinner "bands" side by side (via `line-offset`), each a flat colour
// sampled from the gradient, so together they read as a gradient across the
// stroke's width - a "raised tube" look that stays perpendicular to the
// trail's local heading rather than following screen direction.
//
// Trade-offs inherent to this technique:
// - It's banded, not a smooth blend - more bands looks smoother but costs
//   more layers.
// - Bands are widened slightly past an exact 1/N tile (see OVERLAP_FACTOR)
//   so antialiasing doesn't leave hairline gaps between them.
// - At sharp bends the offset bands can gap or overlap oddly - inherent to
//   offsetting a line, not something this helper can fix.

// MapLibre expression types aren't exported for consumers to reference
// (only used internally by maplibre-gl's own .d.ts), so these stay `any` -
// same as the rest of this codebase treats MapLibre expressions/features.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LineExpression = any;

export interface WidthGradientBand {
  color: string;
  width: LineExpression;
  offset: LineExpression;
}

const OVERLAP_FACTOR = 1.15;

const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

const toHexByte = (value: number): string =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0");

export const interpolateHexColor = (
  from: string,
  to: string,
  t: number,
): string => {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);

  return `#${toHexByte(r1 + (r2 - r1) * t)}${toHexByte(g1 + (g2 - g1) * t)}${toHexByte(b1 + (b2 - b1) * t)}`;
};

// Scales a MapLibre line-width-shaped expression by a constant factor.
//
// This can't simply be `["*", factor, expression]`: MapLibre only allows a
// "zoom" reference to appear as the direct input of a top-level
// "interpolate"/"step" expression, not nested inside other expressions
// (e.g. wrapped in "*") - so scaling has to reach *into* an interpolate's
// stop values (and a case's branch values) rather than wrap the whole
// thing. A plain number, or any other expression that doesn't reference
// zoom, is safe to wrap directly.
export const scaleLineExpression = (
  expression: LineExpression,
  factor: number,
): LineExpression => {
  if (typeof expression === "number") return expression * factor;

  if (Array.isArray(expression) && expression[0] === "interpolate") {
    const [op, interpolation, input, ...stops] = expression;
    const scaledStops: LineExpression[] = [];
    for (let i = 0; i < stops.length; i += 2) {
      scaledStops.push(stops[i], scaleLineExpression(stops[i + 1], factor));
    }
    return [op, interpolation, input, ...scaledStops];
  }

  if (Array.isArray(expression) && expression[0] === "case") {
    const [op, ...rest] = expression;
    // ["case", cond1, val1, cond2, val2, ..., fallback] - every entry is a
    // value to scale except the conditions, which sit at even indices of
    // `rest` (0, 2, 4, ...) other than the trailing fallback.
    const scaledRest = rest.map((entry: LineExpression, index: number) => {
      const isCondition = index % 2 === 0 && index !== rest.length - 1;
      return isCondition ? entry : scaleLineExpression(entry, factor);
    });
    return [op, ...scaledRest];
  }

  // Anything else (a feature-state lookup, etc.) doesn't itself reference
  // zoom, so wrapping it is safe.
  return ["*", factor, expression];
};

// Builds the flat MapLibre expressions for one band: a width and an offset,
// both a constant factor of the layer's overall line width.
const bandWidthExpression = (
  widthExpression: LineExpression,
  bandCount: number,
): LineExpression =>
  scaleLineExpression(widthExpression, (1 / bandCount) * OVERLAP_FACTOR);

const bandOffsetExpression = (
  widthExpression: LineExpression,
  bandCount: number,
  index: number,
): LineExpression => {
  const centerFactor = (index - (bandCount - 1) / 2) / bandCount;
  if (centerFactor === 0) return 0;
  return scaleLineExpression(widthExpression, centerFactor);
};

export const buildWidthGradientBands = (
  widthExpression: LineExpression,
  colors: readonly [string, string],
  bandCount: number,
): WidthGradientBand[] => {
  if (bandCount < 1) {
    throw new Error("bandCount must be at least 1");
  }

  const [fromColor, toColor] = colors;

  return Array.from({ length: bandCount }, (_, index) => ({
    color: interpolateHexColor(
      fromColor,
      toColor,
      bandCount === 1 ? 0 : index / (bandCount - 1),
    ),
    width: bandWidthExpression(widthExpression, bandCount),
    offset: bandOffsetExpression(widthExpression, bandCount, index),
  }));
};
