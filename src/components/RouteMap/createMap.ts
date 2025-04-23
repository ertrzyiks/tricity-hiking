import { Map } from "maplibre-gl";
import { style } from "../HomeMap/mapStyle";
export const createMap = (
  container: HTMLElement,
  initializer: (map: Map) => Promise<() => void>,
) => {
  const map = new Map({
    container: container,
    style,
    zoom: 10,
    minZoom: 9,
    maxZoom: 15,
  });

  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  let cleanUp: (() => void) | void;

  map.on("load", async () => {
    cleanUp = await initializer(map);
  });

  return () => {
    cleanUp?.();
    map.remove();
  };
};
