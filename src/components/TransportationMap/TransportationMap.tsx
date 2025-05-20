import { useEffect, useRef } from "preact/hooks";
import "maplibre-gl/dist/maplibre-gl.css";

import { createMap } from "../RouteMap/createMap";
import { getBounds } from "../../services/getBounds";
import pointImage from "../../assets/places/point.png";

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
      },
    );
  }, []);

  return <div ref={mapRef} className="h-128"></div>;
};
