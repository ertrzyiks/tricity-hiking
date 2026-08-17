import { MAP_MARKER_COLOR } from "../../../constants/colors";

// Points an arrow at a route that is currently outside the map viewport.
// Positioned via absolute x/y (in container pixels) with rotation in
// degrees, where 0deg points straight up.
export const OffscreenArrow = ({
  x,
  y,
  angle,
  label,
}: {
  x: number;
  y: number;
  angle: number;
  label?: string;
}) => {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {label ? (
        // Number badge stays put and upright; only the arrowhead swings
        // around it (attached to its edge) to point towards the route.
        <svg width="32" height="32" viewBox="0 0 32 32">
          <g transform={`rotate(${angle} 16 18)`}>
            <polygon
              points="16,2 22,12 10,12"
              fill={MAP_MARKER_COLOR}
              stroke="white"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <circle
              cx="16"
              cy="18"
              r="10"
              fill={MAP_MARKER_COLOR}
              stroke="white"
              stroke-width="2"
            />
          </g>
          <text
            x="16"
            y="18"
            text-anchor="middle"
            dominant-baseline="central"
            font-family="sans-serif"
            font-weight="700"
            font-size={label.length > 1 ? 11 : 13}
            fill="white"
          >
            {label}
          </text>
        </svg>
      ) : (
        <div style={{ transform: `rotate(${angle}deg)` }}>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <polygon
              points="14,3 24,23 14,18 4,23"
              fill={MAP_MARKER_COLOR}
              stroke="white"
              stroke-width="1.5"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
