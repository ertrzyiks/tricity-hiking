import { type JSX } from "preact";
import { useRef, useLayoutEffect, useEffect } from "preact/hooks";
import { ElevationChart } from "../ElevationChart/ElevationChart";
import { setPoint, resetPoint, $routePoints } from "../../atoms/routePoints";

export const FullElevationChart = ({
  points,
  height = 50,
}: {
  points: number[];
  height?: number;
}) => {
  const max = Math.max(...points);
  const min = 0;
  const markerRef = useRef(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    resetPoint();
  }, []);

  useEffect(() => {
    return $routePoints.subscribe((progress) => {
      if (!markerRef.current) {
        return;
      }

      const marker = markerRef.current as unknown as HTMLDivElement;

      if (progress === null) {
        marker.style.display = "none";
      } else {
        marker.style.left = `${progress * 100}%`;
        marker.style.display = "block";
      }
    });
  }, []);

  const handleMouseMove = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) {
      return;
    }

    const bbox = chartRef.current.getBoundingClientRect();

    if (e.pageX < bbox.x || e.pageX > bbox.x + bbox.width) {
      return;
    }
    const offsetX = e.pageX - bbox.x;
    const offsetWidth = bbox.width;
    setPoint(offsetX / offsetWidth);
  };
  const handleMouseLeave = () => {
    resetPoint();
  };

  const handleTouchMove = (e: JSX.TargetedTouchEvent<HTMLDivElement>) => {
    if (!chartRef.current) {
      return;
    }

    const bbox1 = chartRef.current.getBoundingClientRect();

    if (
      e.touches[0].pageX < bbox1.x ||
      e.touches[0].pageX > bbox1.x + bbox1.width
    ) {
      return;
    }

    e.preventDefault();

    const offsetX = e.touches[0].pageX - bbox1.x;
    const offsetWidth = bbox1.width;
    setPoint(offsetX / offsetWidth);
  };

  return (
    <div
      className="w-full h-[84px] flex py-4 relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseLeave}
    >
      <div className="flex flex-col justify-between items-end pr-2">
        <span className="text-slate-500 -mt-3">{max}m</span>
        <span className="text-slate-500 -mb-3">{min}m</span>
      </div>

      <div className="w-full h-full px-2 relative border-t border-b border-slate-300 border-solid">
        <div ref={chartRef} className="relative">
          <div
            ref={markerRef}
            className="absolute top-0 bottom-0 border-l-2 border-slate-500 bg-slate-500 pointer-events-none"
            style={{ display: "none" }}
          ></div>
          <ElevationChart points={points} height={height} />
        </div>
      </div>
    </div>
  );
};
