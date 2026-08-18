import { useEffect, useRef } from "preact/hooks";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "../HomeMap/mapStyle";
import { getBounds } from "../../../services/getBounds";

// The Network Information API isn't implemented in every browser (notably
// Safari/Firefox). When it's missing we simply can't tell, so we prefetch
// anyway rather than assuming a slow connection.
const isSlowConnection = () => {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) return false;

  return (
    connection.saveData === true ||
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "2g"
  );
};

// Renders an invisible, non-interactive MapLibre map sized like the real
// route map, framed to the same bounds. Its only purpose is to trigger the
// same tile requests the interactive map will make once the visitor opens
// it, so those tiles are already sitting in the browser's HTTP cache by the
// time they're needed. Once the map has nothing left to load, it tears
// itself down again - the cached tiles remain regardless.
export const RouteMapPrefetch = ({
  route,
}: {
  route: GeoJSON.FeatureCollection;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current === null) return;
    if (isSlowConnection()) return;

    const coordinates = route.features.reduce(
      (acc: [number, number][], feature: any) => {
        if (feature.geometry.type === "LineString") {
          return acc.concat(feature.geometry.coordinates);
        }

        return acc;
      },
      [],
    );

    if (coordinates.length === 0) return;

    const bounds = getBounds(coordinates);

    // Match the real map page's viewport size so fitBounds picks the same
    // zoom level, and therefore requests the same tiles.
    containerRef.current.style.width = `${window.innerWidth}px`;
    containerRef.current.style.height = `${Math.max(window.innerHeight - 190, 200)}px`;

    const map = new maplibregl.Map({
      container: containerRef.current,
      interactive: false,
      attributionControl: false,
      style,
      bounds,
      fitBoundsOptions: { padding: 50 },
      zoom: 10,
      minZoom: 9,
      maxZoom: 15,
    });

    let removed = false;
    const removeMap = () => {
      if (removed) return;
      removed = true;
      map.remove();
    };

    // "idle" fires once everything needed for the current view has loaded -
    // at that point the tile requests have already landed in cache, so
    // there's nothing left for this map instance to do.
    map.once("idle", removeMap);

    return removeMap;
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: "-99999px",
        pointerEvents: "none",
        opacity: 0,
      }}
    />
  );
};
