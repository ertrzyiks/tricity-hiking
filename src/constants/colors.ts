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

// German historical place-name overlay (GermanNamesMap): one colour per
// category, kept clear of the red family already used for hiking trails.
export const GERMAN_NAMES_STREET_COLOR = "#d97706"; // amber-600
export const GERMAN_NAMES_DISTRICT_COLOR = "#7c3aed"; // violet-600
export const GERMAN_NAMES_LOCALITY_COLOR = "#0d9488"; // teal-600
