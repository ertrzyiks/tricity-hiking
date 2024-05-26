import { useEffect, useState, useRef } from "preact/hooks";
import maplibregl, { type LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "./mapStyle";
import { getBounds } from "../../geodata/getBounds";
import pointImage from "../../assets/places/point.png";

const TrailAttributeName = ({ value }: { value: string }) => {
  return <span>{value}</span>;
};

const TrailAttributeValue = ({ value }: { value: string }) => {
  return <span className="text-xl">{value}</span>;
};

export const HomeMap = ({ routes }: { routes: GeoJSON.FeatureCollection }) => {
  const [selectedFeature, setSelectedFeature] = useState<
    Record<string, any> | undefined
  >();
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
      const coordinates = routes.features.reduce(
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
        data: routes,
      });

      map.addLayer({
        id: "interaction",
        type: "line",
        source: "lines",
        paint: {
          "line-width": 25,
          "line-color": "transparent",
        },
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

      let hoveredStateId: number | undefined | string;

      map.on("mouseenter", "interaction", (e) => {
        if (!e.features) return;

        map.getCanvas().style.cursor = "pointer";

        if (hoveredStateId) {
          map.setFeatureState(
            { source: "lines", id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = e.features[0].id;

        map.setFeatureState(
          { source: "lines", id: hoveredStateId },
          { hover: true }
        );
      });

      map.on("click", "interaction", (e) => {
        if (!e.features) return;

        const feature = e.features[0];

        if (feature.geometry.type === "LineString") {
          const featureBounds = getBounds(
            feature.geometry.coordinates as LngLatLike[]
          );

          map.fitBounds(featureBounds, {
            animate: true,
            padding: { top: 20, bottom: 20, left: 280, right: 20 },
          });

          setSelectedFeature(feature.properties);
        }
      });

      map.on("mouseleave", "interaction", () => {
        map.getCanvas().style.cursor = "";

        map.setFeatureState(
          { source: "lines", id: hoveredStateId },
          { hover: false }
        );
      });

      map.on("dragstart", () => {
        setSelectedFeature(undefined);
      });
    });
  }, []);

  return (
    <div ref={mapRef}>
      {selectedFeature && (
        <div id="sidebar" class="absolute left-5 bottom-10 z-10 bg-slate-100">
          <div class="flex flex-col px-6 py-8">
            <h3 class="text-2xl">{selectedFeature.name}</h3>

            <p className="text-md">This is some description</p>
          </div>

          <div class="flex flex-col px-6 py-8">
            <div className="grid grid-cols-3 gap-2">
              <TrailAttributeValue
                value={`${selectedFeature.distance.toFixed(0)}m`}
              />
              <TrailAttributeValue
                value={`${selectedFeature.totalGain.toFixed(0)}m`}
              />
              <TrailAttributeValue
                value={`${selectedFeature.totalLoss.toFixed(0)}m`}
              />

              <TrailAttributeName value="Distance" />
              <TrailAttributeName value="Total Gain" />
              <TrailAttributeName value="Total Loss" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
