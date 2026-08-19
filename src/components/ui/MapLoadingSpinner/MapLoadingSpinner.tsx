// Three concentric rings, each drawn as a circle with a gap ("cut") via
// pathLength + stroke-dasharray, spinning in alternating directions (the
// spin-cw/spin-ccw keyframes live in src/styles/base.css). Meant to be shown
// centered over the blurred map placeholder while the interactive map is
// still loading, and unmounted once it's ready.
const RING_COLOR = "#22c55e"; // green-500, matching the site's other map controls

export const MapLoadingSpinner = () => {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="Map loading"
    >
      <circle
        cx="50"
        cy="50"
        r="42"
        pathLength="100"
        stroke={RING_COLOR}
        stroke-width="6"
        stroke-linecap="round"
        stroke-dasharray="70 30"
        class="origin-center animate-[spin-ccw_1.8s_linear_infinite]"
      />
      <circle
        cx="50"
        cy="50"
        r="30"
        pathLength="100"
        stroke={RING_COLOR}
        stroke-width="6"
        stroke-linecap="round"
        stroke-dasharray="65 35"
        class="origin-center animate-[spin-cw_1.4s_linear_infinite]"
      />
      <circle
        cx="50"
        cy="50"
        r="18"
        pathLength="100"
        stroke={RING_COLOR}
        stroke-width="6"
        stroke-linecap="round"
        stroke-dasharray="60 40"
        class="origin-center animate-[spin-ccw_1s_linear_infinite]"
      />
    </svg>
  );
};
