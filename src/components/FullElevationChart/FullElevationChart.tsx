import { ElevationChart } from "../ElevationChart/ElevationChart";

export const FullElevationChart = ({
  points,
  height = 50,
}: {
  points: number[];
  height?: number;
}) => {
  const max = Math.max(...points);
  const min = 0;

  return (
    <div className="w-full h-[52px] flex my-4 relative">
      <div className="flex flex-col justify-between items-end pr-2">
        <span className="text-slate-500 -mt-3">{max}m</span>
        <span className="text-slate-500 -mb-3">{min}m</span>
      </div>

      <div className="w-full h-full px-2 border-t border-b border-slate-300 border-solid">
        <ElevationChart points={points} height={height} />
      </div>
    </div>
  );
};
