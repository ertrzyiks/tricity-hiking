import { useEffect, useRef } from "preact/hooks";
import "maplibre-gl/dist/maplibre-gl.css";

import { createMap } from "../../services/createMap";
import { routePointHighlighter } from "./routePointHighlighter";
import { getBounds } from "../../services/getBounds";
import {
  createRouteMarkersData,
  generateTriangleSVG,
  generatePerpendicularLineSVG,
  generateLoopMarkerSVG,
} from "../../services/routeMarkers";

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

    return createMap(mapRef.current, {}, async (map) => {
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
        const startTriangleDataUrl = generateTriangleSVG(16, "#991b1b"); // red color for start
        const endLineDataUrl = generatePerpendicularLineSVG(16, "#991b1b"); // red color for end
        const loopMarkerDataUrl = generateLoopMarkerSVG(16, "#991b1b"); // red color for loops

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

      return routePointHighlighter(map, {
        coordinates,
      });
    });
  }, []);

  return <div ref={mapRef}></div>;
};
