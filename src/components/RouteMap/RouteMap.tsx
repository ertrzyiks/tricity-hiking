import { useEffect, useRef } from "preact/hooks";
import "maplibre-gl/dist/maplibre-gl.css";

import { createMap } from "../../services/createMap";
import { routePointHighlighter } from "./routePointHighlighter";
import { getBounds } from "../../services/getBounds";
import pointImage from "../../assets/places/point.png";
import { loadImageToMap } from "./loadImageToMap";

export const RouteMap = ({ route }: { route: GeoJSON.FeatureCollection }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current === null) return;

    const feature = route.features.find(
      (f) => f.geometry.type === "LineString",
    );

    if (!feature || feature.geometry.type !== "LineString") {
      return;
    }

    return createMap(mapRef.current, {}, async (map) => {
      const coordinates = route.features.reduce(
        (acc: [number, number][], feature: any) => {
          if (feature.geometry.type === "LineString") {
            return acc.concat(feature.geometry.coordinates);
          }

          return acc;
        },
        [],
      );

      const bounds = getBounds(coordinates);

      map.addSource("lines", {
        type: "geojson",
        data: route,
      });

      map.addLayer({
        id: "lines",
        type: "line",
        source: "lines",
        paint: {
          "line-width": 5,
          "line-color": "#e11d48",
        },
      });

      loadImageToMap(map, "poi_15", pointImage.src);

      map.addLayer({
        id: "places",
        type: "symbol",
        source: "lines",
        layout: {
          "icon-image": `poi_15`,
          "icon-overlap": "always",
        },
      });

      map.fitBounds(bounds, {
        animate: false,
        padding: 50,
      });

      return routePointHighlighter(map, {
        coordinates,
      });
    });
  }, []);

  return <div ref={mapRef}></div>;
};
