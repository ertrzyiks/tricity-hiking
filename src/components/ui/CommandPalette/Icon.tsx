// Hand-picked subset of @iconify-json/mdi, inlined as SVG.
//
// astro-icon's <Icon> is an Astro component and can't be rendered from
// inside a Preact island, so the handful of glyphs the command palette
// needs are copied here instead of pulling in a whole icon library client-side.
const PATHS = {
  magnify:
    "M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.52 6.52 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5",
  close:
    "M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z",
  hiking:
    "M17.47 8.67H19V23h-1.53V12.6c-.8-.16-1.55-.46-2.26-.89s-1.31-.93-1.82-1.51l-.62 3.07l2.23 2.2V23h-2v-6l-2.24-2.2L8.89 23H6.73S9.86 7.22 9.89 7.09c.11-.48.33-.85.7-1.09c.37-.27.74-.4 1.12-.4q.585 0 1.08.27c.34.17.6.42.79.74l1.06 1.63c.29.54.68 1.01 1.17 1.39s1.05.67 1.66.87zM8.55 5.89L7.4 5.65c-.57-.15-1.09-.03-1.56.29c-.46.32-.74.76-.84 1.34l-.81 3.98c-.03.29.03.55.19.79s.37.37.62.41l2.21.43zM13 1c-1.1 0-2 .9-2 2s.9 2 2 2s2-.89 2-2s-.89-2-2-2",
  forest:
    "M16 12L9 2L2 12h1.86L0 18h7v4h4v-4h7l-3.86-6zm4.14 0H22L15 2l-2.39 3.41L17.92 13h-1.95l3.22 5H24zM13 19h4v3h-4z",
  silverware:
    "M8.1 13.34L3.91 9.16a4.01 4.01 0 0 1 0-5.66l7.02 7zm6.78-1.81L13.41 13l6.88 6.88l-1.41 1.41L12 14.41l-6.88 6.88l-1.41-1.41l9.76-9.76c-.71-1.53-.21-3.68 1.38-5.27c1.91-1.92 4.65-2.28 6.11-.82c1.47 1.47 1.11 4.21-.81 6.12c-1.59 1.59-3.74 2.09-5.27 1.38",
  "open-in-new":
    "M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2z",
} as const;

export type IconName = keyof typeof PATHS;

export const Icon = ({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    class={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d={PATHS[name]} />
  </svg>
);
