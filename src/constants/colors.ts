/**
 * Color constants used across the application
 */

// Map marker colors
export const MAP_MARKER_COLOR = "#b91c1c"; // red-700 - darker red for map icons (start, end, loop markers)

// Trail line colors: a gradient across the stroke's width (see
// lineWidthGradientBands.ts), not along its length.
export const TRAIL_LINE_GRADIENT: readonly [string, string] = [
  "#c53c00",
  "#f05100",
];
