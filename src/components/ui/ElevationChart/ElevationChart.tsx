import { useLayoutEffect, useRef, useState } from "preact/hooks";

import { useDebounce } from "../../useDebounce";

export const ElevationChart = ({
  points,
  highlightAt,
  height = 50,
}: {
  points: number[];
  height?: number;
  highlightAt?: number | null;
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const debouncedSetWidth = useDebounce(setWidth);

  useLayoutEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        debouncedSetWidth(entry.contentRect.width);
      }
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [debouncedSetWidth]);

  const max = Math.max(...points);
  const min = 0;
  const chartWidth = width ?? 1200;

  const toChartY = (y: number) => (y * height) / (max - min);
  const toChartX = (x: number) => (x * chartWidth) / (points.length - 1);

  const chartPoints = [
    `${toChartX(0)},${toChartY(max - min)}`,
    ...points.map((y, x) => `${toChartX(x)},${toChartY(max - y)}`),
    `${toChartX(points.length - 1)},${toChartY(max - min)}`,
  ];

  const highlightIndex = highlightAt
    ? Math.min(Math.floor(highlightAt * points.length), points.length - 1)
    : null;
  const highlightPoint =
    highlightIndex !== null ? [points[highlightIndex], highlightIndex] : null;

  return (
    <svg
      ref={ref}
      className="w-full"
      height={height}
      viewBox={`0 0 ${chartWidth} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="#e2e8f0"
        stroke="#94a3b8"
        strokeWidth="1"
        points={chartPoints.join("\n")}
      />
      {highlightPoint !== null && (
        <>
          <circle
            cx={toChartX(highlightPoint[1])}
            cy={toChartY(max - highlightPoint[0])}
            fill="#64A3DB"
            stroke="#000000"
            r="3"
          />
          <line
            x1={toChartX(highlightPoint[1])}
            y1={toChartY(max - highlightPoint[0]) + 3}
            x2={toChartX(highlightPoint[1])}
            y2={toChartY(max)}
            stroke="#000000"
          />
        </>
      )}
    </svg>
  );
};
