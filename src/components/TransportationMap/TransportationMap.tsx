import { useEffect, useRef } from "preact/hooks";
import "maplibre-gl/dist/maplibre-gl.css";

import { createMap } from "../RouteMap/createMap";
import { getBounds } from "../../services/getBounds";
import pointImage from "../../assets/places/skm_stop.png";

export const TransportationMap = ({
  data,
}: {
  data: GeoJSON.FeatureCollection;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current === null) return;

    const feature = data.features.find((f) => f.geometry.type === "LineString");

    if (!feature || feature.geometry.type !== "LineString") {
      return;
    }

    return createMap(
      mapRef.current,
      {
        minZoom: 8,
      },
      async (map) => {
        const coordinates = data.features.reduce(
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
          data,
          cluster: false,
        });

        console.log("data", data);

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
        if (!map.hasImage("skm-stop")) map.addImage("skm-stop", image.data);

        map.addLayer({
          id: "places",
          type: "symbol",
          source: "lines",
          layout: {
            "icon-image": `skm-stop`,
            "icon-allow-overlap": true,
            "icon-size": [
              "case",
              ["==", ["get", "desc:isStation"], true],
              1.3,
              0.8,
            ],
            "text-allow-overlap": true,
            "text-field": ["get", "name"],
            "text-font": ["Roboto Regular", "Noto Sans Regular"],
            "text-size": [
              "step",
              ["zoom"],
              ["case", ["==", ["get", "desc:isStation"], true], 15, 0],
              11,
              ["case", ["==", ["get", "desc:isStation"], true], 15, 12],
              14,
              ["case", ["==", ["get", "desc:isStation"], true], 15, 13],
            ],

            "text-offset": [-1.0, 0],
            "text-anchor": "right",
          },
          paint: {
            "text-color": "#333",
            "text-halo-width": 1,
            "text-halo-color": "#fff",
          },
        });

        map.fitBounds(bounds, {
          animate: false,
          padding: 50,
        });
      },
    );
  }, []);

  return <div ref={mapRef} className="h-full"></div>;
};
