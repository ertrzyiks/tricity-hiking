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
 * Generate SVG for a triangle marker pointing in a specific direction
 */
export const generateTriangleSVG = (
  bearing: number,
  size: number = 12,
  color: string = "#e11d48",
): string => {
  const halfSize = size / 2;
  const height = size * 0.866; // equilateral triangle height

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${bearing} ${halfSize} ${halfSize})">
        <polygon points="${halfSize},${halfSize - height / 2} ${halfSize - halfSize},${halfSize + height / 2} ${halfSize + halfSize},${halfSize + height / 2}" 
                 fill="${color}" 
                 stroke="white" 
                 stroke-width="1"/>
      </g>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Generate SVG for a perpendicular line marker
 */
export const generatePerpendicularLineSVG = (
  bearing: number,
  size: number = 12,
  color: string = "#e11d48",
): string => {
  const halfSize = size / 2;
  const lineLength = size * 0.8;
  const perpBearing = (bearing + 90) % 360; // perpendicular to the trail direction

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${perpBearing} ${halfSize} ${halfSize})">
        <line x1="${halfSize}" y1="${halfSize - lineLength / 2}" 
              x2="${halfSize}" y2="${halfSize + lineLength / 2}" 
              stroke="${color}" 
              stroke-width="3" 
              stroke-linecap="round"/>
      </g>
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
} => {
  const startFeatures: GeoJSON.Feature[] = [];
  const endFeatures: GeoJSON.Feature[] = [];

  let startIndex = 0;
  let endIndex = 0;

  routes.features.forEach((feature) => {
    if (feature.geometry.type !== "LineString") return;

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
          bearing: endData.bearing,
          routeId: feature.id,
          routeName: feature.properties?.name,
          index: endIndex,
        },
      });
      endIndex++;
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
  };
};
