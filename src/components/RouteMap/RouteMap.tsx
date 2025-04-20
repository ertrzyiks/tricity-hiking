import { useEffect, useRef } from "preact/hooks";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "../HomeMap/mapStyle";
import { getBounds } from "../../services/getBounds";
import { $routePoints } from "../../atoms/routePoints";
import pointImage from "../../assets/places/point.png";
import markerImage from "../../assets/places/marker.png";

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
        [],
      );

      const bounds = getBounds(coordinates);

      map.addSource("lines", {
        type: "geojson",
        data: route,
      });

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

      const image2 = await map.loadImage(markerImage.src);
      if (!map.hasImage("marker_15")) map.addImage("marker_15", image2.data);

      map.addLayer({
        id: "places",
        type: "symbol",
        source: "lines",
        layout: {
          "icon-image": `poi_15`,
          "icon-overlap": "always",
        },
      });

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
          "icon-anchor": "bottom",
        },
      });

      map.fitBounds(bounds, {
        animate: false,
        padding: 50,
      });

      const cleanUpRoutePointListener = $routePoints.subscribe((progress) => {
        if (progress === null) {
          point.features[0].properties.iconSize = 0;
        } else {
          const index = Math.floor(progress * coordinates.length);
          const currentCoordinate = coordinates[index];
          point.features[0].geometry.coordinates = currentCoordinate;
          point.features[0].properties.iconSize = 1;
        }

        const source = map.getSource("point") as maplibregl.GeoJSONSource;
        source.setData(point);
      });

      return () => {
        cleanUpRoutePointListener();
      };
    });
  }, []);

  return <div ref={mapRef}></div>;
};
