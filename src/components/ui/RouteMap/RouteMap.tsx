import { useEffect, useRef, useState } from "preact/hooks";
import "maplibre-gl/dist/maplibre-gl.css";

import { createMap } from "../../../services/createMap";
import { routePointHighlighter } from "./routePointHighlighter";
import { getBounds } from "../../../services/getBounds";
import { padBounds } from "../../../services/padBounds";
import {
  computeOffscreenIndicators,
  type OffscreenIndicator,
} from "../../../services/offscreenIndicator";
import { OffscreenArrow } from "../OffscreenArrow/OffscreenArrow";
import {
  createRouteMarkersData,
  generateTriangleSVG,
  generatePerpendicularLineSVG,
  generateLoopMarkerSVG,
} from "../../../services/routeMarkers";
import { MAP_MARKER_COLOR } from "../../../constants/colors";

// How far past the route's own bounding box the map can still be panned:
// a fraction of that box's width/height on each side, plus a flat buffer.
const MAX_BOUNDS_PADDING_RATIO = 0.5;
const MAX_BOUNDS_EXTRA_KM = 30;

export const RouteMap = ({ route }: { route: GeoJSON.FeatureCollection }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [indicators, setIndicators] = useState<OffscreenIndicator[]>([]);
  // Stays false until the map has finished loading everything it needs for
  // the initial view, so the blurred static preview underneath keeps
  // showing instead of a half-loaded tile mosaic.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (mapRef.current === null) return;

    const feature = route.features.find(
      (f) => f.geometry.type === "LineString",
    );

    if (!feature || feature.geometry.type !== "LineString") {
      return;
    }

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

    const maxBounds = padBounds(bounds, {
      paddingRatio: MAX_BOUNDS_PADDING_RATIO,
      extraKm: MAX_BOUNDS_EXTRA_KM,
    });

    return createMap(
      mapRef.current,
      {
        // Frame the route already at construction time so the very first
        // paint matches the fitBounds() call below. Without this the map
        // starts at its default center/zoom, gets pulled to the edge of
        // maxBounds on the first render, and only snaps onto the route once
        // the "load" event fires later — a visible jump from a wide Tricity
        // overview down to the route.
        bounds,
        fitBoundsOptions: { padding: 50 },
        maxBounds,
      },
      async (map) => {
        map.addSource("lines", {
          type: "geojson",
          data: route,
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
            "line-color": "#e11d48",
          },
        });

        // Add start and end markers for the route
        const { startMarkers, endMarkers, loopMarkers } =
          createRouteMarkersData(route);

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

        // Add loop markers (combined start/end for loops)
        map.addSource("loop-markers", {
          type: "geojson",
          data: loopMarkers,
        });

        // Load all marker images asynchronously
        const loadMarkerImages = async () => {
          // Generate and load single images for each marker type
          const startTriangleDataUrl = generateTriangleSVG(
            16,
            MAP_MARKER_COLOR,
          ); // red color for start
          const endLineDataUrl = generatePerpendicularLineSVG(
            16,
            MAP_MARKER_COLOR,
          ); // red color for end
          const loopMarkerDataUrl = generateLoopMarkerSVG(16, MAP_MARKER_COLOR); // red color for loops

          // Load images using Image() constructor to work with SVG data URLs
          const imagePromises: Promise<void>[] = [];

          // Load start triangle image
          const startPromise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              if (!map.hasImage("start-triangle")) {
                map.addImage("start-triangle", img);
              }
              resolve();
            };
            img.onerror = () => {
              console.error("Failed to load start triangle image");
              resolve();
            };
            img.src = startTriangleDataUrl;
          });
          imagePromises.push(startPromise);

          // Load end line image
          const endPromise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              if (!map.hasImage("end-line")) {
                map.addImage("end-line", img);
              }
              resolve();
            };
            img.onerror = () => {
              console.error("Failed to load end line image");
              resolve();
            };
            img.src = endLineDataUrl;
          });
          imagePromises.push(endPromise);

          // Load loop marker image
          const loopPromise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              if (!map.hasImage("loop-marker")) {
                map.addImage("loop-marker", img);
              }
              resolve();
            };
            img.onerror = () => {
              console.error("Failed to load loop marker image");
              resolve();
            };
            img.src = loopMarkerDataUrl;
          });
          imagePromises.push(loopPromise);

          // Wait for all images to load
          await Promise.all(imagePromises);

          // Add marker layers only after images are loaded
          map.addLayer({
            id: "start-markers",
            type: "symbol",
            source: "start-markers",
            layout: {
              "icon-image": "start-triangle",
              "icon-rotate": ["get", "bearing"],
              "icon-size": 1,
              "icon-allow-overlap": true,
            },
          });

          map.addLayer({
            id: "end-markers",
            type: "symbol",
            source: "end-markers",
            layout: {
              "icon-image": "end-line",
              "icon-rotate": ["get", "bearing"],
              "icon-size": 1,
              "icon-allow-overlap": true,
            },
          });

          map.addLayer({
            id: "loop-markers",
            type: "symbol",
            source: "loop-markers",
            layout: {
              "icon-image": "loop-marker",
              "icon-rotate": ["get", "bearing"],
              "icon-size": 1,
              "icon-allow-overlap": true,
            },
          });
        };

        // Load markers after map is ready
        loadMarkerImages().catch(console.error);

        map.fitBounds(bounds, {
          animate: false,
          padding: 50,
        });

        // "idle" fires once everything needed for the current view has
        // loaded and been rendered - reveal the map only then, so it never
        // shows through as a half-loaded tile mosaic over the placeholder.
        map.once("idle", () => setIsReady(true));

        // Track the route with an edge arrow whenever panning takes it fully
        // out of view, until it becomes visible again.
        const target = [{ id: "route", bounds }];
        const updateIndicators = () =>
          setIndicators(computeOffscreenIndicators(map, target));
        updateIndicators();
        map.on("move", updateIndicators);

        const cleanupHighlighter = routePointHighlighter(map, {
          coordinates,
        });

        return () => {
          map.off("move", updateIndicators);
          cleanupHighlighter?.();
        };
      },
    );
  }, []);

  return (
    // A wrapper owns the fade: MapLibre imperatively adds its own classes
    // (maplibregl-map and friends) to the container we pass it as `container`,
    // and Preact re-rendering a `class` prop replaces that attribute wholesale
    // - so this state-driven class has to live on a div MapLibre never
    // touches, not on mapRef itself, or it would wipe MapLibre's classes out
    // the moment isReady flips.
    <div
      class={`h-full transition-opacity duration-300 ${
        isReady ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div ref={mapRef} class="h-full">
        {indicators.map((indicator) => (
          <OffscreenArrow
            key={indicator.id}
            x={indicator.x}
            y={indicator.y}
            angle={indicator.angle}
          />
        ))}
      </div>
    </div>
  );
};
