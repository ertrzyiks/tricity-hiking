import { Map, type MapOptions } from "maplibre-gl";
import { style, glyphs } from "../HomeMap/mapStyle";
export const createMap = (
  container: HTMLElement,
  options: Omit<MapOptions, "container" | "style">,
  initializer: (map: Map) => Promise<(() => void) | void>,
) => {
  const map = new Map({
    container: container,
    style,
    zoom: 10,
    minZoom: 9,
    maxZoom: 15,
    cooperativeGestures: true,
    ...options,
  });

  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  // map.showCollisionBoxes = true;

  let cleanUp: (() => void) | void;

  map.on("load", async () => {
    map.setGlyphs(glyphs);
    cleanUp = await initializer(map);
  });

  return () => {
    cleanUp?.();
    map.remove();
  };
};
