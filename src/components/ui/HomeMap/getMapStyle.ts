import type { Map as MaplibreMap } from "maplibre-gl";
import { $theme, type Theme } from "../../../atoms/theme";
import { style as lightStyle, glyphs } from "./mapStyle";
import { style as darkStyle } from "./mapStyle.dark";

export function getMapStyle(theme: Theme) {
  return theme === "dark" ? darkStyle : lightStyle;
}

/**
 * Keep a live MapLibre instance's basemap in sync with the theme toggle -
 * the vector/raster style bakes in its own water/land/road colors, so
 * flipping dark mode needs a real setStyle rather than a CSS filter over
 * the canvas. Shared by every map that mounts client-side (HomeMap,
 * createMap); returns an unsubscribe function for the caller's cleanup.
 */
export function subscribeMapTheme(map: MaplibreMap) {
  return $theme.listen((theme) => {
    map.setStyle(getMapStyle(theme));
  });
}

export { glyphs };
