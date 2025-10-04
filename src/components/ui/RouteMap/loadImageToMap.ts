import { type Map } from "maplibre-gl";

export const loadImageToMap = (map: Map, id: string, src: string) => {
  map.loadImage(src).then((image) => {
    if (!map.hasImage(id)) map.addImage(id, image.data);
  });
};
