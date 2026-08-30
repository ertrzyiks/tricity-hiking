import { useEffect, useRef } from "preact/hooks";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "../HomeMap/mapStyle";
import { getBounds } from "../../../services/getBounds";
import { buildWidthGradientBands } from "../../../services/lineWidthGradientBands";
import { TRAIL_LINE_GRADIENT } from "../../../constants/colors";
import pointImage from "../../../assets/places/point.png";

// How many flat-coloured bands approximate the gradient across the trail
// line's width - see lineWidthGradientBands.ts.
const TRAIL_LINE_BAND_COUNT = 5;

export const PreviewRouteMap = ({
  route,
}: {
  route: GeoJSON.FeatureCollection;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current === null) return;

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

    const map = new maplibregl.Map({
      container: mapRef.current,
      interactive: false,
      attributionControl: {
        compact: false,
      },
      style,
      validateStyle: false,
      // Frame the route already at construction time so the very first
      // paint matches the fitBounds() call below, instead of flashing the
      // default center/zoom first and jumping to the route once "load"
      // fires.
      bounds,
      fitBoundsOptions: { padding: 50 },
      zoom: 10,
      minZoom: 9,
      maxZoom: 15,
    });

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on("load", async () => {
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

      // The visible trail line is several thinner bands stacked side by
      // side (via line-offset) rather than a single layer, so the colour
      // can grade across the stroke's *width* - MapLibre's line-gradient
      // only grades along a line's length. See lineWidthGradientBands.ts.
      buildWidthGradientBands(
        5,
        TRAIL_LINE_GRADIENT,
        TRAIL_LINE_BAND_COUNT,
      ).forEach((band, index) => {
        map.addLayer({
          id: `lines-band-${index}`,
          type: "line",
          source: "lines",
          layout: {
            "line-cap": "butt",
            "line-join": "round",
          },
          paint: {
            "line-width": band.width,
            "line-offset": band.offset,
            "line-color": band.color,
          },
        });
      });

      const image = await map.loadImage(pointImage.src);
      if (!map.hasImage("poi_15")) map.addImage("poi_15", image.data);

      map.fitBounds(bounds, {
        animate: false,
        padding: 50,
      });
    });
  }, []);

  return <div ref={mapRef}></div>;
};
