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

      {label && (
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"
          style={{ transform: "translateY(2px)" }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
