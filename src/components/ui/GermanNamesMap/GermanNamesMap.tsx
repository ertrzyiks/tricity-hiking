import { useEffect, useRef, useState } from "preact/hooks";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { createMap } from "../../../services/createMap";
import {
  OLD_MAP_INK_COLOR,
  OLD_MAP_PAPER_COLOR,
  OLD_MAP_GRAY_COLOR,
} from "../../../constants/colors";

type Category = "street name" | "district name" | "locality name";

const SOURCE_ID = "german-names";

// Everything is drawn in ink-on-paper greys so the overlay reads like an old
// printed map: streets as white roads with black edges (a wide black casing
// under a narrower white line), districts as dashed grey boundaries with
// spaced-out capitals, localities as white dots ringed in black.
type LayerGroup = {
  category: Category;
  label: string;
  labelMinZoom: number;
  fillColor: string;
  fillOpacity: number;
  // Optional wide line drawn underneath `line` to give it dark edges.
  casing?: { color: string; width: number };
  line: { color: string; width: number; dasharray?: number[] };
  text: {
    size: number;
    letterSpacing: number;
    uppercase: boolean;
  };
};

const LAYER_GROUPS: LayerGroup[] = [
  {
    category: "district name",
    label: "Districts",
    labelMinZoom: 10,
    fillColor: OLD_MAP_GRAY_COLOR,
    fillOpacity: 0.08,
    line: { color: OLD_MAP_GRAY_COLOR, width: 2, dasharray: [3, 2] },
    text: { size: 13, letterSpacing: 0.2, uppercase: true },
  },
  {
    category: "street name",
    label: "Streets & squares",
    labelMinZoom: 13,
    fillColor: OLD_MAP_PAPER_COLOR,
    fillOpacity: 0.6,
    casing: { color: OLD_MAP_INK_COLOR, width: 6 },
    line: { color: OLD_MAP_PAPER_COLOR, width: 3.5 },
    text: { size: 12, letterSpacing: 0.05, uppercase: false },
  },
  {
    category: "locality name",
    label: "Localities",
    labelMinZoom: 10,
    fillColor: OLD_MAP_GRAY_COLOR,
    fillOpacity: 0.12,
    line: { color: OLD_MAP_INK_COLOR, width: 1.5 },
    text: { size: 13, letterSpacing: 0.1, uppercase: false },
  },
];

const layerIds = (category: Category) => {
  const slug = category.replace(/\s+/g, "-");
  return {
    fill: `german-names-${slug}-fill`,
    casing: `german-names-${slug}-casing`,
    line: `german-names-${slug}-line`,
    circle: `german-names-${slug}-circle`,
    label: `german-names-${slug}-label`,
  };
};

const DEFAULT_CATEGORIES: Category[] = [
  "street name",
  "district name",
  "locality name",
];

export const GermanNamesMap = ({
  data,
  categories = DEFAULT_CATEGORIES,
  center = [18.653, 54.3498],
  zoom = 12,
  minZoom = 9,
  maxZoom = 18,
}: {
  data: GeoJSON.FeatureCollection;
  // Which category layers (and legend toggles) this map instance shows -
  // lets the same component serve the region-wide locality map and the
  // per-city street/district overlays without rendering empty toggles for
  // categories that aren't in `data` anyway.
  categories?: Category[];
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}) => {
  const activeGroups = LAYER_GROUPS.filter((group) =>
    categories.includes(group.category),
  );
  const activeLayerIds = activeGroups.flatMap((group) => {
    const ids = layerIds(group.category);
    // Only streets get a casing layer - and queryRenderedFeatures returns
    // nothing at all (not just skips it) if asked for a layer that doesn't
    // exist, which would silently break the click popup for the whole map.
    return [
      ids.fill,
      ...(group.casing ? [ids.casing] : []),
      ids.line,
      ids.circle,
      ids.label,
    ];
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [visibility, setVisibility] = useState<Record<Category, boolean>>(
    Object.fromEntries(
      categories.map((category) => [category, true]),
    ) as Record<Category, boolean>,
  );

  useEffect(() => {
    if (mapRef.current === null) return;

    return createMap(
      mapRef.current,
      { center, zoom, minZoom, maxZoom },
      async (map) => {
        mapInstanceRef.current = map;

        map.addSource(SOURCE_ID, {
          type: "geojson",
          data,
        });

        for (const group of activeGroups) {
          const ids = layerIds(group.category);
          const filter: maplibregl.ExpressionSpecification = [
            "==",
            ["get", "category"],
            group.category,
          ];

          // Fill is meant for Polygon/MultiPolygon features only (squares,
          // district boundaries, a village outline here and there) - but
          // maplibre's fill renderer doesn't ignore a LineString that
          // passes the filter, it closes the path and fills the chord
          // between its start and end, so without the geometry-type guard
          // every street gets a faint "shadow" triangle under it.
          map.addLayer({
            id: ids.fill,
            type: "fill",
            source: SOURCE_ID,
            filter: [
              "all",
              filter,
              [
                "any",
                ["==", ["geometry-type"], "Polygon"],
                ["==", ["geometry-type"], "MultiPolygon"],
              ],
            ] as maplibregl.ExpressionSpecification,
            paint: {
              "fill-color": group.fillColor,
              "fill-opacity": group.fillOpacity,
            },
          });

          // Line renders both actual street LineStrings and the outline of
          // any polygon in this category (squares, district boundaries).
          // Streets get a wider dark casing underneath so they read as a
          // white road with black edges.
          if (group.casing) {
            map.addLayer({
              id: ids.casing,
              type: "line",
              source: SOURCE_ID,
              filter,
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": group.casing.color,
                "line-width": group.casing.width,
              },
            });
          }

          map.addLayer({
            id: ids.line,
            type: "line",
            source: SOURCE_ID,
            filter,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": group.line.color,
              "line-width": group.line.width,
              ...(group.line.dasharray && {
                "line-dasharray": group.line.dasharray,
              }),
            },
          });

          // Circle is meant for Point features only (a few localities and
          // landmarks Nominatim could only resolve to a single node) - but
          // maplibre's circle renderer draws one circle per *coordinate* of
          // whatever passes the filter, so without the geometry-type guard
          // it also beads a dot along every vertex of every line/polygon.
          map.addLayer({
            id: ids.circle,
            type: "circle",
            source: SOURCE_ID,
            filter: [
              "all",
              filter,
              ["==", ["geometry-type"], "Point"],
            ] as maplibregl.ExpressionSpecification,
            paint: {
              "circle-color": OLD_MAP_PAPER_COLOR,
              "circle-radius": 5,
              "circle-stroke-width": 2,
              "circle-stroke-color": OLD_MAP_INK_COLOR,
            },
          });

          map.addLayer({
            id: ids.label,
            type: "symbol",
            source: SOURCE_ID,
            filter,
            minzoom: group.labelMinZoom,
            layout: {
              "text-field": ["get", "german"],
              "text-font": ["Roboto Regular", "Noto Sans Regular"],
              "text-size": group.text.size,
              "text-letter-spacing": group.text.letterSpacing,
              "text-transform": group.text.uppercase ? "uppercase" : "none",
              "text-variable-anchor": ["top", "bottom", "left", "right"],
              "text-radial-offset": 0.6,
              "text-justify": "auto",
            },
            paint: {
              "text-color": OLD_MAP_INK_COLOR,
              "text-halo-color": OLD_MAP_PAPER_COLOR,
              "text-halo-width": 1.5,
            },
          });
        }

        for (const id of activeLayerIds) {
          map.on("mouseenter", id, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", id, () => {
            map.getCanvas().style.cursor = "";
          });
        }

        map.on("click", (e: maplibregl.MapMouseEvent) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: activeLayerIds,
          });

          if (!features.length) return;

          const properties = features[0].properties as {
            german: string;
            polish: string;
            category: Category;
            exists: boolean;
          };

          const polishLine = properties.exists
            ? properties.polish
            : `<em>no longer exists</em> (${properties.polish})`;

          new maplibregl.Popup({ closeButton: true, maxWidth: "260px" })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="text-sm">
                <div class="font-bold">${properties.german}</div>
                <div class="text-slate-600">${polishLine}</div>
                <div class="text-xs text-slate-400 mt-1">${properties.category}</div>
              </div>`,
            )
            .addTo(map);
        });
      },
    );
  }, []);

  const toggle = (category: Category) => {
    setVisibility((prev) => {
      const next = { ...prev, [category]: !prev[category] };
      const map = mapInstanceRef.current;

      if (map) {
        const ids = layerIds(category);
        const cssVisibility = next[category] ? "visible" : "none";
        for (const id of [
          ids.fill,
          ids.casing,
          ids.line,
          ids.circle,
          ids.label,
        ]) {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", cssVisibility);
          }
        }
      }

      return next;
    });
  };

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="h-full"></div>

      <div className="absolute top-2 right-2 z-10 bg-white/95 rounded-lg shadow-md p-3 flex flex-col gap-2 text-sm max-w-[180px]">
        <span className="font-bold text-slate-700">Old German names</span>
        {activeGroups.map((group) => (
          <label
            key={group.category}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={visibility[group.category]}
              onChange={() => toggle(group.category)}
            />
            <LegendSwatch group={group} />
            {group.label}
          </label>
        ))}
      </div>
    </div>
  );
};

const LegendSwatch = ({ group }: { group: LayerGroup }) => (
  <svg width="16" height="12" viewBox="0 0 16 12" className="shrink-0">
    {group.casing && (
      <line
        x1="2"
        y1="6"
        x2="14"
        y2="6"
        stroke={group.casing.color}
        stroke-width={group.casing.width}
        stroke-linecap="round"
      />
    )}
    <line
      x1="2"
      y1="6"
      x2="14"
      y2="6"
      stroke={group.line.color}
      stroke-width={group.casing ? group.line.width : 2}
      stroke-linecap="round"
      stroke-dasharray={group.line.dasharray?.map((n) => n * 2).join(" ")}
    />
  </svg>
);
