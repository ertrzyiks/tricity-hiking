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
import { trackEvent } from "../../services/analytics";
import {
  createRouteMarkersData,
  generateTriangleSVG,
  generatePerpendicularLineSVG,
} from "../../services/routeMarkers";
import { loadImageToMap } from "../RouteMap/loadImageToMap";

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
        [],
      );

      const bounds = getBounds(coordinates);

      map.fitBounds(bounds, {
        animate: false,
        padding: 50,
      });

      map.addSource("lines", {
        type: "geojson",
        data: routes,
      });

      map.addLayer({
        id: "interaction",
        type: "line",
        source: "lines",
        paint: {
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            5, // at zoom 9, line width is 5
            10,
            10, // at zoom 10, line width is 10
            15,
            30, // at zoom 15, line width is 30
          ],
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

      // Add start and end markers for routes
      const { startMarkers, endMarkers } = createRouteMarkersData(routes);

      // Add start markers (triangles)
      map.addSource("start-markers", {
        type: "geojson",
        data: startMarkers,
      });

      // Add end markers (perpendicular lines)
      map.addSource("end-markers", {
        type: "geojson",
        data: endMarkers,
      });

      // Load all marker images asynchronously
      const loadMarkerImages = async () => {
        // Generate and add start marker images
        for (let index = 0; index < startMarkers.features.length; index++) {
          const feature = startMarkers.features[index];
          const bearing = feature.properties?.bearing || 0;
          const iconId = `start-triangle-${index}`;
          const dataUrl = generateTriangleSVG(bearing, 16, "#059669"); // green color for start

          loadImageToMap(map, iconId, dataUrl);
        }

        // Generate and add end marker images
        for (let index = 0; index < endMarkers.features.length; index++) {
          const feature = endMarkers.features[index];
          const bearing = feature.properties?.bearing || 0;
          const iconId = `end-line-${index}`;
          const dataUrl = generatePerpendicularLineSVG(bearing, 16, "#dc2626"); // red color for end

          loadImageToMap(map, iconId, dataUrl);
        }

        // Give some time for images to load before adding layers
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Add start marker layer
        map.addLayer({
          id: "start-markers-layer",
          type: "symbol",
          source: "start-markers",
          layout: {
            "icon-image": ["concat", "start-triangle-", ["get", "index"]],
            "icon-size": 1,
            "icon-allow-overlap": true,
          },
        });

        // Add end marker layer
        map.addLayer({
          id: "end-markers-layer",
          type: "symbol",
          source: "end-markers",
          layout: {
            "icon-image": ["concat", "end-line-", ["get", "index"]],
            "icon-size": 1,
            "icon-allow-overlap": true,
          },
        });
      };

      // Load markers after map is ready
      loadMarkerImages().catch(console.error);

      const tooltip = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "route_tooltip",
      });

      let hoveredStateId: number | undefined | string;

      map.on("mouseenter", "interaction", (e) => {
        if (!e.features) return;

        map.getCanvas().style.cursor = "pointer";

        if (hoveredStateId) {
          map.setFeatureState(
            { source: "lines", id: hoveredStateId },
            { hover: false },
          );
        }
        hoveredStateId = e.features[0].id;

        map.setFeatureState(
          { source: "lines", id: hoveredStateId },
          { hover: true },
        );

        const hoveredFeature = e.features[0];
        const geometry = hoveredFeature.geometry;

        if (geometry.type === "LineString" && hoveredFeature.properties.name) {
          tooltip
            .setLngLat([e.lngLat.lng, e.lngLat.lat])
            .setText(hoveredFeature.properties.name)
            .addTo(map)
            .trackPointer();

          trackEvent("route hovered", {
            slug: hoveredFeature.properties.routeSlug,
          });
        }
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
            (f) => f.id === clickedFeature.properties.parentFeatureId,
          );
        }

        if (!feature || feature.geometry.type !== "LineString") return;

        const featureBounds = getBounds(
          feature.geometry.coordinates as LngLatLike[],
        );

        map.fitBounds(featureBounds, {
          animate: true,
          padding: { top: 20, bottom: 20, left: 280, right: 20 },
        });

        setSelectedFeature(feature);
        trackEvent("route clicked", {
          slug: feature.properties?.routeSlug,
        });
        tooltip.remove();
      });

      map.on("mouseleave", "interaction", () => {
        map.getCanvas().style.cursor = "";

        map.setFeatureState(
          { source: "lines", id: hoveredStateId },
          { hover: false },
        );

        tooltip.remove();
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
                    (point: number[]) => point[2],
                  )}
                />
              </div>
            )}

          <div class="flex flex-col px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              <TrailAttributeValue
                value={`${mToKm(selectedFeature.properties.distance).toFixed(
                  2,
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
            <Button href={`/routes/${selectedFeature.properties.routeSlug}/`}>
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
