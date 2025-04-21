import { type JSX } from "preact";
import { useRef, useLayoutEffect } from "preact/hooks";
import { ElevationChart } from "../ElevationChart/ElevationChart";
import { setPoint, resetPoint } from "../../atoms/routePoints";

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

  const showMarker = (x: number) => {
    if (markerRef.current) {
      const marker = markerRef.current as unknown as HTMLDivElement;
      marker.style.left = `${x * 100}%`;
      marker.style.display = "block";
      setPoint(x);
    }
  };

  const hideMarker = () => {
    if (markerRef.current) {
      const marker = markerRef.current as unknown as HTMLDivElement;
      marker.style.display = "none";
      resetPoint();
    }
  };

  const handleMouseMove = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    // showMarker(e.offsetX, e.currentTarget.offsetWidth);
    if (!chartRef.current) {
      return;
    }

    const bbox1 = chartRef.current.getBoundingClientRect();

    if (e.pageX < bbox1.x || e.pageX > bbox1.x + bbox1.width) {
      return;
    }
    const offsetX = e.pageX - bbox1.x;
    const offsetWidth = bbox1.width;
    showMarker(offsetX / offsetWidth);
  };
  const handleMouseLeave = () => {
    hideMarker();
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
    showMarker(offsetX / offsetWidth);
  };

  useLayoutEffect(() => {
    hideMarker();
  }, []);

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
