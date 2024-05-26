export const ElevationChart = ({
  points,
  height = 50,
}: {
  points: number[];
  height?: number;
}) => {
  const max = Math.max(...points);
  const min = Math.min(...points);

  const toChartY = (y: number) => (y * height) / (max - min);

  const chartPoints = [
    `0,${toChartY(max - min)}`,
    ...points.map((y, x) => `${x},${toChartY(max - y)}`),
    `${points.length - 1},${toChartY(max - min)}`,
  ];

  return (
    <svg className="w-full" viewBox={`0 0 ${points.length} ${height}`}>
      <polyline
        fill="#e2e8f0"
        stroke="#94a3b8"
        stroke-width="1"
        points={chartPoints.join("\n")}
      />
    </svg>
  );
};
