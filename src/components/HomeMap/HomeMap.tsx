import { useEffect, useState, useRef } from "preact/hooks";
import maplibregl, { type LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "./mapStyle";
import { getBounds } from "../../services/getBounds";
import { mToKm } from "../../services/mToKm";
import { ElevationChart } from "../ElevationChart/ElevationChart";
import { Button } from "../Button/Button";
import { TrailAttributeName } from "../TrailAttributeName/TrailAttributeName";
import { TrailAttributeValue } from "../TrailAttributeValue/TrailAttributeValue";
import pointImage from "../../assets/places/point.png";

export const HomeMap = ({ routes }: { routes: GeoJSON.FeatureCollection }) => {
  const [selectedFeature, setSelectedFeature] = useState<
    GeoJSON.Feature | undefined
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
            6,
            4,
          ],
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

        const clickedFeature = e.features[0];
        let feature = routes.features.find((f) => f.id === clickedFeature.id);

        if (
          map.getZoom() < 13 &&
          clickedFeature.geometry.type !== "LineString" &&
          clickedFeature.properties.parentFeatureId
        ) {
          feature = routes.features.find(
            (f) => f.id === clickedFeature.properties.parentFeatureId
          );
        }

        if (!feature || feature.geometry.type !== "LineString") return;

        const featureBounds = getBounds(
          feature.geometry.coordinates as LngLatLike[]
        );

        map.fitBounds(featureBounds, {
          animate: true,
          padding: { top: 20, bottom: 20, left: 280, right: 20 },
        });

        setSelectedFeature(feature);
      });

      map.on("mouseleave", "interaction", () => {
        map.getCanvas().style.cursor = "";

        map.setFeatureState(
          { source: "lines", id: hoveredStateId },
          { hover: false }
        );
      });
    });
  }, []);

  const handleCloseSelection = () => {
    setSelectedFeature(undefined);
  };

  return (
    <div ref={mapRef}>
      {selectedFeature && selectedFeature.properties && (
        <div
          id="sidebar"
          className="absolute left-5 w-72 bottom-10 z-10 bg-slate-100 border-t-4 border-green-500"
        >
          <div class="flex flex-col px-4 py-3 pr-8">
            <h3 class="text-2xl">{selectedFeature.properties.name}</h3>
          </div>

          <p className="px-4 py-4 pt-0 text-base">
            {selectedFeature.properties.description}
          </p>

          {selectedFeature &&
            selectedFeature.geometry.type === "LineString" && (
              <div>
                <ElevationChart
                  points={selectedFeature.geometry.coordinates.map(
                    (point: number[]) => point[2]
                  )}
                />
              </div>
            )}

          <div class="flex flex-col px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              <TrailAttributeValue
                value={`${mToKm(selectedFeature.properties.distance).toFixed(
                  2
                )}km`}
              />
              <TrailAttributeValue
                value={`${selectedFeature.properties.totalGain.toFixed(0)}m`}
              />
              <TrailAttributeValue
                value={`${selectedFeature.properties.totalLoss.toFixed(0)}m`}
              />

              <TrailAttributeName value="Distance" />
              <TrailAttributeName value="Total Gain" />
              <TrailAttributeName value="Total Loss" />
            </div>
          </div>

          <div className="flex items-center justify-center px-4 py-6 gap-2">
            <Button
              href={`/tricity-hiking/routes/${selectedFeature.properties.routeSlug}`}
            >
              Learn more
            </Button>
            <Button onClick={handleCloseSelection} variant="neutral">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
