/**
 * Utility functions for creating route start and end markers
 */

/**
 * Calculate bearing between two points in degrees
 */
export const calculateBearing = (
  start: [number, number],
  end: [number, number],
): number => {
  const [lon1, lat1] = start;
  const [lon2, lat2] = end;

  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // normalize to 0-360

  return bearing;
};

/**
 * Calculate distance between two points in meters using Haversine formula
 */
export const calculateDistance = (
  start: [number, number],
  end: [number, number],
): number => {
  const [lon1, lat1] = start;
  const [lon2, lat2] = end;

  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get start point and direction from a LineString feature
 */
export const getStartPointWithDirection = (
  feature: GeoJSON.Feature,
): { point: [number, number]; bearing: number } | null => {
  if (feature.geometry.type !== "LineString") return null;

  const coordinates = feature.geometry.coordinates as [
    number,
    number,
    number?,
  ][];
  if (coordinates.length < 2) return null;

  const start = [coordinates[0][0], coordinates[0][1]] as [number, number];
  const second = [coordinates[1][0], coordinates[1][1]] as [number, number];

  return {
    point: start,
    bearing: calculateBearing(start, second),
  };
};

/**
 * Get end point and direction from a LineString feature
 */
export const getEndPointWithDirection = (
  feature: GeoJSON.Feature,
): { point: [number, number]; bearing: number } | null => {
  if (feature.geometry.type !== "LineString") return null;

  const coordinates = feature.geometry.coordinates as [
    number,
    number,
    number?,
  ][];
  if (coordinates.length < 2) return null;

  const end = [
    coordinates[coordinates.length - 1][0],
    coordinates[coordinates.length - 1][1],
  ] as [number, number];
  const secondToLast = [
    coordinates[coordinates.length - 2][0],
    coordinates[coordinates.length - 2][1],
  ] as [number, number];

  return {
    point: end,
    bearing: calculateBearing(secondToLast, end),
  };
};

/**
 * Check if a route is a loop (start and end points are close together)
 */
export const isRouteLoop = (
  feature: GeoJSON.Feature,
  thresholdMeters: number = 100,
): boolean => {
  if (feature.geometry.type !== "LineString") return false;

  const coordinates = feature.geometry.coordinates as [
    number,
    number,
    number?,
  ][];
  if (coordinates.length < 2) return false;

  const start = [coordinates[0][0], coordinates[0][1]] as [number, number];
  const end = [
    coordinates[coordinates.length - 1][0],
    coordinates[coordinates.length - 1][1],
  ] as [number, number];

  const distance = calculateDistance(start, end);
  return distance <= thresholdMeters;
};

/**
 * Generate SVG for a triangle marker pointing north (no rotation applied)
 */
export const generateTriangleSVG = (
  size: number = 12,
  color: string = "#e11d48",
): string => {
  const halfSize = size / 2;
  const height = size * 0.866; // equilateral triangle height

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="${halfSize},${halfSize - height / 2} ${halfSize - halfSize},${halfSize + height / 2} ${halfSize + halfSize},${halfSize + height / 2}"
                 fill="${color}"
                 stroke="white"
                 stroke-width="1"/>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Generate SVG for a perpendicular line marker pointing north (no rotation applied)
 */
export const generatePerpendicularLineSVG = (
  size: number = 12,
  color: string = "#e11d48",
): string => {
  const halfSize = size / 2;
  const lineLength = size * 0.8;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <line y1="${halfSize}" x1="${halfSize - lineLength / 2}"
              y2="${halfSize}" x2="${halfSize + lineLength / 2}"
              stroke="${color}"
              stroke-width="3"
              stroke-linecap="round"/>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Generate SVG for a right-pointing triangle marker for loops
 */
export const generateLoopMarkerSVG = (
  size: number = 16,
  color: string = "#7c3aed",
): string => {
  const halfSize = size / 2;
  const triangleSize = size * 0.7; // Make triangle slightly smaller than the full size
  const triangleHeight = triangleSize * 0.866; // equilateral triangle height

  // Calculate points for a right-pointing triangle centered in the viewBox
  const leftX = halfSize - triangleSize / 2;
  const rightX = halfSize + triangleSize / 2;
  const topY = halfSize - triangleHeight / 2;
  const bottomY = halfSize + triangleHeight / 2;
  const middleY = halfSize;

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="${leftX},${topY} ${rightX},${middleY} ${leftX},${bottomY}"
                 fill="${color}"
                 stroke="white"
                 stroke-width="2"/>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Create GeoJSON data for route markers
 */
export const createRouteMarkersData = (
  routes: GeoJSON.FeatureCollection,
): {
  startMarkers: GeoJSON.FeatureCollection;
  endMarkers: GeoJSON.FeatureCollection;
  loopMarkers: GeoJSON.FeatureCollection;
} => {
  const startFeatures: GeoJSON.Feature[] = [];
  const endFeatures: GeoJSON.Feature[] = [];
  const loopFeatures: GeoJSON.Feature[] = [];

  let startIndex = 0;
  let endIndex = 0;
  let loopIndex = 0;

  routes.features.forEach((feature) => {
    if (feature.geometry.type !== "LineString") return;

    // Check if this route is a loop
    if (isRouteLoop(feature)) {
      const startData = getStartPointWithDirection(feature);
      if (startData) {
        loopFeatures.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: startData.point,
          },
          properties: {
            bearing: startData.bearing,
            routeId: feature.id,
            routeName: feature.properties?.name,
            index: loopIndex,
          },
        });
        loopIndex++;
      }
    } else {
      // Regular route with separate start and end markers
      const startData = getStartPointWithDirection(feature);
      const endData = getEndPointWithDirection(feature);

      if (startData) {
        startFeatures.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: startData.point,
          },
          properties: {
            bearing: startData.bearing,
            routeId: feature.id,
            routeName: feature.properties?.name,
            index: startIndex,
          },
        });
        startIndex++;
      }

      if (endData) {
        endFeatures.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: endData.point,
          },
          properties: {
            bearing: endData.bearing, // line will be perpendicular when base is vertical
            routeId: feature.id,
            routeName: feature.properties?.name,
            index: endIndex,
          },
        });
        endIndex++;
      }
    }
  });

  return {
    startMarkers: {
      type: "FeatureCollection",
      features: startFeatures,
    },
    endMarkers: {
      type: "FeatureCollection",
      features: endFeatures,
    },
    loopMarkers: {
      type: "FeatureCollection",
      features: loopFeatures,
    },
  };
};
