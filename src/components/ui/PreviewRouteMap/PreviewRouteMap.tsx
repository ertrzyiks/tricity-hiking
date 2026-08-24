import { useEffect, useRef } from "preact/hooks";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "../HomeMap/mapStyle";
import { getBounds } from "../../../services/getBounds";
import { orientLineStringsWestToEast } from "../../../services/orientLineStringsWestToEast";
import pointImage from "../../../assets/places/point.png";

export const PreviewRouteMap = ({
  route,
}: {
  route: GeoJSON.FeatureCollection;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current === null) return;

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

    const map = new maplibregl.Map({
      container: mapRef.current,
      interactive: false,
      attributionControl: {
        compact: false,
      },
      style,
      validateStyle: false,
      // Frame the route already at construction time so the very first
      // paint matches the fitBounds() call below, instead of flashing the
      // default center/zoom first and jumping to the route once "load"
      // fires.
      bounds,
      fitBoundsOptions: { padding: 50 },
      zoom: 10,
      minZoom: 9,
      maxZoom: 15,
    });

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on("load", async () => {
      map.addSource("lines", {
        type: "geojson",
        // Reoriented so the gradient below reads left-to-right on screen
        // rather than following the trail's recorded start point.
        data: orientLineStringsWestToEast(route),
        lineMetrics: true,
      });

      map.addLayer({
        id: "lines-outline",
        type: "line",
        source: "lines",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": 7,
          "line-color": "#f3f4f6",
        },
      });

      map.addLayer({
        id: "lines",
        type: "line",
        source: "lines",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": 5,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "#c53c00",
            1,
            "#f05100",
          ],
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
