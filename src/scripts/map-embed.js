import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Define the map syle (OpenStreetMap raster tiles)
const style = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap Contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm", // This must match the source key above
    },
  ],
};

const map = new maplibregl.Map({
  container: "map",
  style,
  center: [18.5850785, 54.4288153],
  zoom: 10,
  minZoom: 9,
  maxZoom: 15,
});

map.dragRotate.disable();
map.touchZoomRotate.disableRotation();

map.on("load", () => {
  const el = document.querySelector("#map");

  const routes = JSON.parse(el.dataset.routes);
  const coordinates = routes.features.reduce((acc, feature) => {
    if (feature.geometry.type === "LineString") {
      return acc.concat(feature.geometry.coordinates);
    }

    return acc;
  }, []);

  const bounds = coordinates.reduce((bounds, coord) => {
    return bounds.extend(coord);
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

  map.addSource("lines", {
    type: "geojson",
    data: routes,
  });

  map.addLayer({
    id: "lines",
    type: "line",
    source: "lines",
    paint: {
      "line-width": 3,
      // Use a get expression (https://maplibre.org/maplibre-style-spec/expressions/#get)
      // to set the line-color to a feature property value.
      // "line-color": ["get", "color"],
      "line-color": "#ff0000",
    },
  });

  map.fitBounds(bounds, {
    animate: false,
    padding: 50,
  });
});
