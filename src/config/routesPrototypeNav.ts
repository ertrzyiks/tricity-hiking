export interface PrimarySection {
  id: string;
  label: string;
  href: string;
  icon: string;
  description: string;
}

/**
 * The site's top-level sections (mirrors Layout.astro's <nav>), reused by
 * every /routes navigation prototype so the "Routes" entry can point back
 * at whichever variant is currently open.
 */
export const getPrimarySections = (routesHref: string): PrimarySection[] => [
  {
    id: "routes",
    label: "Routes",
    href: routesHref,
    icon: "mdi:hiking",
    description: "Interactive map and trail lists",
  },
  {
    id: "activities",
    label: "Activities",
    href: "/activities/",
    icon: "mdi:bike",
    description: "Things to do besides hiking",
  },
  {
    id: "food",
    label: "Food",
    href: "/food/",
    icon: "mdi:silverware-fork-knife",
    description: "Where to eat near the trail",
  },
  {
    id: "transportation",
    label: "Transportation",
    href: "/transportation/",
    icon: "mdi:bus",
    description: "Getting to the trailheads",
  },
  {
    id: "history",
    label: "History",
    href: "/history/",
    icon: "mdi:bank",
    description: "Stories behind the region",
  },
  {
    id: "articles",
    label: "Articles",
    href: "/blog/the-best-hiking-trails-near-gdansk/",
    icon: "mdi:newspaper-variant-outline",
    description: "Guides and write-ups",
  },
];

export type RoutesSubsectionId = "map" | "tricity" | "nearby";

export interface RoutesSubsection {
  id: RoutesSubsectionId;
  label: string;
  icon: string;
  description: string;
}

/**
 * The nested subpages that today live at /routes/, /list/ and /nearby/,
 * modelled here as panels of a single prototype page (plus a "detail" panel
 * for drilling into a single route) rather than separate routes, so every
 * pattern can be compared without wiring up 15+ static pages.
 */
export const routesSubsections: RoutesSubsection[] = [
  {
    id: "map",
    label: "Map",
    icon: "mdi:map-outline",
    description: "Explore trails visually",
  },
  {
    id: "tricity",
    label: "Tricity",
    icon: "mdi:format-list-bulleted",
    description: "Routes within Gdańsk, Sopot & Gdynia",
  },
  {
    id: "nearby",
    label: "Nearby",
    icon: "mdi:near-me",
    description: "A bit further out, still worth it",
  },
];

export interface PrototypeVariant {
  id: string;
  href: string;
  name: string;
  pattern: string;
  summary: string;
}

/**
 * Registry of the 5 prototype variants, used by the small "which prototype
 * am I looking at" banner each variant renders, and by the index page that
 * lists them all.
 */
export const prototypeVariants: PrototypeVariant[] = [
  {
    id: "routes1",
    href: "/routes1/",
    name: "Variant 1",
    pattern: "Sticky tabs + breadcrumb trail",
    summary:
      "A refined version of the current tab bar: accessible tablist for Map/Tricity/Nearby, with a breadcrumb trail that grows on drill-down.",
  },
  {
    id: "routes2",
    href: "/routes2/",
    name: "Variant 2",
    pattern: "Mega menu",
    summary:
      "The top nav's Routes entry expands into a mega menu that doubles as the section switcher, collapsing into an accordion drawer on mobile.",
  },
  {
    id: "routes3",
    href: "/routes3/",
    name: "Variant 3",
    pattern: "Docked sidebar / nav rail",
    summary:
      "A persistent, collapsible sidebar lists every top-level section, auto-expanding Routes into a tree of Map/Tricity/Nearby, docs-site style.",
  },
  {
    id: "routes4",
    href: "/routes4/",
    name: "Variant 4",
    pattern: "Bottom tab bar + segmented control",
    summary:
      "Mobile-first app shell: primary sections live in a thumb-reachable bottom bar, with an iOS-style segmented control for the Routes subviews.",
  },
  {
    id: "routes5",
    href: "/routes5/",
    name: "Variant 5",
    pattern: "Breadcrumb-led minimal chrome",
    summary:
      "Chrome is stripped to a slim bar and a path (Tricity Hiking / Routes / Map); the last breadcrumb segment opens a sibling switcher.",
  },
];
