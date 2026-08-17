import type { LngLatBounds, Map } from "maplibre-gl";

// How far from the container edge an indicator sits, in pixels. Keeps the
// arrow (and its number badge) fully visible instead of getting clipped.
const EDGE_INSET = 28;

export interface OffscreenTarget {
  id: string;
  bounds: LngLatBounds;
  label?: string;
}

export interface OffscreenIndicator {
  id: string;
  label?: string;
  // Position of the indicator on the map container, in pixels.
  x: number;
  y: number;
  // Rotation in degrees, where 0 points straight up.
  angle: number;
}

const boundsIntersect = (a: LngLatBounds, b: LngLatBounds) =>
  a.getWest() <= b.getEast() &&
  a.getEast() >= b.getWest() &&
  a.getSouth() <= b.getNorth() &&
  a.getNorth() >= b.getSouth();

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// For each target whose bounds don't intersect the current viewport, works
// out where to place an arrow along the line from the map's center to the
// nearest point of that target, clipped to the edge of the container.
export const computeOffscreenIndicators = (
  map: Map,
  targets: OffscreenTarget[],
): OffscreenIndicator[] => {
  const viewBounds = map.getBounds();
  const container = map.getContainer();
  const width = container.clientWidth;
  const height = container.clientHeight;

  const centerLngLat = viewBounds.getCenter();
  const centerPx = map.project(centerLngLat);

  const halfW = width / 2 - EDGE_INSET;
  const halfH = height / 2 - EDGE_INSET;

  const indicators: OffscreenIndicator[] = [];

  for (const target of targets) {
    if (boundsIntersect(viewBounds, target.bounds)) continue;

    // Nearest point of the target's bounding box to the map center — the
    // point the arrow should point towards.
    const nearestLngLat = {
      lng: clamp(
        centerLngLat.lng,
        target.bounds.getWest(),
        target.bounds.getEast(),
      ),
      lat: clamp(
        centerLngLat.lat,
        target.bounds.getSouth(),
        target.bounds.getNorth(),
      ),
    };

    const targetPx = map.project(nearestLngLat);
    const dx = targetPx.x - centerPx.x;
    const dy = targetPx.y - centerPx.y;

    if (dx === 0 && dy === 0) continue;

    // Scale the center->target ray so it lands exactly on the (inset)
    // container edge, same technique used for radar/off-screen indicators.
    const scale = Math.min(
      dx !== 0 ? Math.abs(halfW / dx) : Infinity,
      dy !== 0 ? Math.abs(halfH / dy) : Infinity,
    );

    indicators.push({
      id: target.id,
      label: target.label,
      x: width / 2 + dx * scale,
      y: height / 2 + dy * scale,
      angle: (Math.atan2(dx, -dy) * 180) / Math.PI,
    });
  }

  return indicators;
};
