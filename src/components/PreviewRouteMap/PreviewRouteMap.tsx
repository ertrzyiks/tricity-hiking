import { useEffect, useRef } from "preact/hooks";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "../HomeMap/mapStyle";
import { getBounds } from "../../services/getBounds";
import pointImage from "../../assets/places/point.png";

export const PreviewRouteMap = ({
  route,
}: {
  route: GeoJSON.FeatureCollection;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current === null) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      interactive: false,
      attributionControl: {
        compact: false,
      },
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

      const image = await map.loadImage(pointImage.src);
      if (!map.hasImage("poi_15")) map.addImage("poi_15", image.data);

      map.fitBounds(bounds, {
        animate: false,
        padding: 50,
      });
    });
  }, []);

  return <div ref={mapRef}></div>;
};
