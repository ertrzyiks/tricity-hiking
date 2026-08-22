import { useEffect, useState, useRef } from "preact/hooks";
import maplibregl, { type LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { style } from "./mapStyle";
import { getBounds } from "../../../services/getBounds";
import { padBounds } from "../../../services/padBounds";
import { mToKm } from "../../../services/mToKm";
import { ElevationChart } from "../ElevationChart/ElevationChart";
import { Button } from "../Button/Button";
import { TrailAttributeName } from "../TrailAttributeName/TrailAttributeName";
import { TrailAttributeValue } from "../TrailAttributeValue/TrailAttributeValue";
import { trackEvent } from "../../../services/analytics";
import { generateNumberMarkerSVG } from "../../../services/routeMarkers";
import { MAP_MARKER_COLOR, ROUTE_LINE_COLOR } from "../../../constants/colors";
import {
  computeOffscreenIndicators,
  type OffscreenIndicator,
} from "../../../services/offscreenIndicator";
import { OffscreenArrow } from "../OffscreenArrow/OffscreenArrow";

const NUMBER_MARKER_SIZE = 24;

// How far past the routes' own bounding box the map can still be panned:
// a fraction of that box's width/height on each side, plus a flat buffer.
const MAX_BOUNDS_PADDING_RATIO = 0.5;
const MAX_BOUNDS_EXTRA_KM = 30;

export const HomeMap = ({ routes }: { routes: GeoJSON.FeatureCollection }) => {
  const [selectedFeature, setSelectedFeature] = useState<
    GeoJSON.Feature | undefined
  >();
  const [indicators, setIndicators] = useState<OffscreenIndicator[]>([]);
  // Stays false until the map has finished loading everything it needs for
  // the initial view, so the blurred static preview underneath keeps
  // showing instead of a half-loaded tile mosaic.
  const [isReady, setIsReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  const [lineColor, setLineColor] = useState(ROUTE_LINE_COLOR);
  // Mirrors `lineColor` so the mount effect below (which only runs once, on
  // mount) can read whatever color was picked before the map finished
  // loading, without needing to re-run and rebuild the whole map every time
  // the color changes.
  const lineColorRef = useRef(lineColor);

  // Applies color changes to the already-rendered map. The "lines" layer is
  // added synchronously with the initial color (see below), so this only
  // needs to guard against a color change firing before that's happened.
  useEffect(() => {
    lineColorRef.current = lineColor;

    const map = mapInstanceRef.current;
    if (map && map.getLayer("lines")) {
      map.setPaintProperty("lines", "line-color", lineColor);
    }
  }, [lineColor]);

  useEffect(() => {
    if (mapRef.current === null) return;

    // Set once the map loads, so it can be detached again on unmount.
    let updateIndicators: (() => void) | undefined;

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

    const maxBounds = padBounds(bounds, {
      paddingRatio: MAX_BOUNDS_PADDING_RATIO,
      extraKm: MAX_BOUNDS_EXTRA_KM,
    });

    const map = new maplibregl.Map({
      container: mapRef.current,
      style,
      // Frame the routes already at construction time so the very first
      // paint matches the fitBounds() call below. Without this the map
      // starts at its default center/zoom, gets pulled to the edge of
      // maxBounds on the first render, and only snaps onto the routes once
      // the "load" event fires later — a visible jump from a wide overview
      // down to the routes.
      bounds,
      fitBoundsOptions: { padding: 50 },
      zoom: 10,
      minZoom: 9,
      maxZoom: 15,
      maxBounds,
    });

    mapInstanceRef.current = map;

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on("load", async () => {
      map.fitBounds(bounds, {
        animate: false,
        padding: 50,
      });

      // "idle" fires once everything needed for the current view has
      // loaded and been rendered - reveal the map only then, so it never
      // shows through as a half-loaded tile mosaic over the placeholder.
      map.once("idle", () => setIsReady(true));

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
        id: "lines-outline",
        type: "line",
        source: "lines",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            ["case", ["boolean", ["feature-state", "hover"], false], 4, 3],
            15,
            ["case", ["boolean", ["feature-state", "hover"], false], 8, 6],
          ],
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
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            ["case", ["boolean", ["feature-state", "hover"], false], 3, 2],
            15,
            ["case", ["boolean", ["feature-state", "hover"], false], 6, 4],
          ],
          "line-color": lineColorRef.current,
        },
      });

      // One numbered marker per trail, placed at its midpoint. Trail 1
      // renders above trail 2, which renders above trail 3, and so on, via
      // symbol-sort-key, so a lower number always stays on top when markers
      // overlap.
      const numberMarkerFeatures: GeoJSON.Feature[] = [];
      const routeNumbers = new Set<number>();
      const offscreenTargets: {
        id: string;
        bounds: ReturnType<typeof getBounds>;
        label: string;
      }[] = [];

      routes.features.forEach((feature: any) => {
        if (feature.geometry.type !== "LineString") return;

        const routeNumber = feature.properties?.routeNumber;
        if (typeof routeNumber !== "number") return;

        routeNumbers.add(routeNumber);

        const lineCoordinates = feature.geometry.coordinates as [
          number,
          number,
        ][];
        const midpoint =
          lineCoordinates[Math.floor(lineCoordinates.length / 2)];

        numberMarkerFeatures.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [midpoint[0], midpoint[1]],
          },
          properties: {
            routeNumber,
          },
        });

        offscreenTargets.push({
          id: String(
            feature.id ?? feature.properties?.routeSlug ?? routeNumber,
          ),
          bounds: getBounds(lineCoordinates),
          label: String(routeNumber),
        });
      });

      map.addSource("number-markers", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: numberMarkerFeatures,
        },
      });

      await Promise.all(
        Array.from(routeNumbers).map(
          (routeNumber) =>
            new Promise<void>((resolve) => {
              const iconId = `number-marker-${routeNumber}`;
              if (map.hasImage(iconId)) {
                resolve();
                return;
              }

              const img = new Image();
              img.onload = () => {
                if (!map.hasImage(iconId)) map.addImage(iconId, img);
                resolve();
              };
              img.onerror = () => {
                console.error(
                  `Failed to load number marker image for ${routeNumber}`,
                );
                resolve();
              };
              img.src = generateNumberMarkerSVG(
                routeNumber,
                NUMBER_MARKER_SIZE,
                MAP_MARKER_COLOR,
              );
            }),
        ),
      );

      map.addLayer({
        id: "number-markers",
        type: "symbol",
        source: "number-markers",
        layout: {
          "icon-image": [
            "concat",
            "number-marker-",
            ["to-string", ["get", "routeNumber"]],
          ],
          "icon-size": 1,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          // Lower trail numbers get a higher sort key, so they paint on
          // top of higher numbers when markers overlap.
          "symbol-sort-key": ["*", -1, ["get", "routeNumber"]],
        },
      });

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

      // Track every route with an edge arrow + number whenever panning
      // takes it fully out of view, until it becomes visible again.
      updateIndicators = () =>
        setIndicators(computeOffscreenIndicators(map, offscreenTargets));
      updateIndicators();
      map.on("move", updateIndicators);
    });

    return () => {
      mapInstanceRef.current = null;
      if (updateIndicators) map.off("move", updateIndicators);
    };
  }, []);

  const handleCloseSelection = () => {
    setSelectedFeature(undefined);
  };

  return (
    // A wrapper owns the fade: MapLibre imperatively adds its own classes
    // (maplibregl-map and friends) to the container we pass it as
    // `container`, and Preact re-rendering a `class` prop replaces that
    // attribute wholesale - so this state-driven class has to live on a
    // div MapLibre never touches, not on mapRef itself, or it would wipe
    // MapLibre's classes out the moment isReady flips.
    //
    // The page (routes.astro) that renders this component also renders a
    // statically-generated MapLoadingSpinner ahead of it in the DOM, so
    // this wrapper fading in over it - and over the blurred placeholder
    // beneath that - is what makes the spinner disappear too. No isReady
    // wiring is needed here for the spinner specifically.
    <div
      class={`relative h-full transition-opacity duration-300 ${
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
            label={indicator.label}
          />
        ))}

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

      <label
        class="absolute top-2 left-2 flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white opacity-75 shadow ring-1 ring-black/10 transition-opacity hover:opacity-100"
        aria-label="Route line color"
      >
        <input
          type="color"
          value={lineColor}
          onInput={(event) =>
            setLineColor((event.currentTarget as HTMLInputElement).value)
          }
          class="h-10 w-10 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>
    </div>
  );
};
