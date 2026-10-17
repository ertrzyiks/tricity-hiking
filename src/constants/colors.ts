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

// How many flat-coloured bands approximate that gradient - shared so every
// trail line layer (HomeMap, PreviewRouteMap, RouteMap) looks consistent.
export const TRAIL_LINE_BAND_COUNT = 5;

// German historical place-name overlay (GermanNamesMap): monochrome ink-on-
// paper palette so the overlay reads like an old printed map rather than
// competing with the coloured hiking trails.
export const OLD_MAP_INK_COLOR = "#1a1a1a"; // outlines, casings, labels
export const OLD_MAP_PAPER_COLOR = "#ffffff"; // street fill, label halos
export const OLD_MAP_GRAY_COLOR = "#5c5c5c"; // district boundaries, area tints
