import { useEffect, useRef } from "preact/hooks";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "../HomeMap/mapStyle";
import { getBounds } from "../../geodata/getBounds";
import pointImage from "../../assets/places/point.png";

export const RouteMap = ({ route }: { route: GeoJSON.FeatureCollection }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current === null) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style,
      zoom: 10,
      minZoom: 9,
      maxZoom: 15,
    });

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on("load", async () => {
      const coordinates = route.features.reduce(
        (acc: [number, number][], feature: any) => {
          if (feature.geometry.type === "LineString") {
            return acc.concat(feature.geometry.coordinates);
          }

          return acc;
        },
        []
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
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            5,
            3,
          ],
          "line-color": "#ff0000",
        },
      });

      const image = await map.loadImage(pointImage.src);
      if (!map.hasImage("poi_15")) map.addImage("poi_15", image.data);

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
    });
  }, []);

  return <div ref={mapRef}></div>;
};
