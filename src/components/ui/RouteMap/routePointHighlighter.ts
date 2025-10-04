import { type Map } from "maplibre-gl";
import { $routePoints } from "../../atoms/routePoints";
import markerImage from "../../assets/places/marker.png";
import { loadImageToMap } from "./loadImageToMap";

export const routePointHighlighter = (
  map: Map,
  { coordinates }: { coordinates: number[][] },
) => {
  const point = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {
          iconSize: 0,
        },
        geometry: {
          type: "Point" as const,
          coordinates: coordinates[0],
        },
      },
    ],
  };

  map.addSource("point", {
    type: "geojson",
    data: point,
  });

  loadImageToMap(map, "marker_15", markerImage.src);

  map.addLayer({
    id: "point",
    source: "point",
    type: "symbol",
    layout: {
      "icon-image": "marker_15",
      "icon-overlap": "always",
      "icon-size": ["get", "iconSize"],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-anchor": "center",
    },
  });

  return $routePoints.subscribe((progress) => {
    if (progress === null) {
      point.features[0].properties.iconSize = 0;
    } else {
      const index = Math.min(
        coordinates.length - 1,
        Math.floor(progress * coordinates.length),
      );
      const currentCoordinate = coordinates[index];
      point.features[0].geometry.coordinates = currentCoordinate;
      point.features[0].properties.iconSize = 1;
    }

    const source = map.getSource("point") as maplibregl.GeoJSONSource;
    source.setData(point);
  });
};
