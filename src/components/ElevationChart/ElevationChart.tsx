import { useLayoutEffect, useRef, useState } from "preact/hooks";

import { useDebounce } from "../useDebounce";

export const ElevationChart = ({
  points,
  height = 50,
}: {
  points: number[];
  height?: number;
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(points.length);
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
  const min = Math.min(...points);

  const toChartY = (y: number) => (y * height) / (max - min);
  const toChartX = (x: number) => (x * width) / points.length;

  const chartPoints = [
    `${toChartX(0)},${toChartY(max - min)}`,
    ...points.map((y, x) => `${toChartX(x)},${toChartY(max - y)}`),
    `${toChartX(points.length - 1)},${toChartY(max - min)}`,
  ];

  return (
    <svg
      ref={ref}
      className="w-full h-[50px]"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="#e2e8f0"
        stroke="#94a3b8"
        strokeWidth="1"
        points={chartPoints.join("\n")}
      />
    </svg>
  );
};
