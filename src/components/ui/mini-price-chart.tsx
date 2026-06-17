import type { PricePoint } from "@/lib/types";

export function MiniPriceChart({ points }: { points: PricePoint[] }) {
  const chartPoints = points.slice(-260);

  if (chartPoints.length < 2) {
    return <div className="chart-empty">Price chart unavailable.</div>;
  }

  const width = 680;
  const height = 130;
  const min = Math.min(...chartPoints.map((point) => point.close));
  const max = Math.max(...chartPoints.map((point) => point.close));
  const spread = max - min || 1;
  const path = chartPoints
    .map((point, index) => {
      const x = (index / (chartPoints.length - 1)) * width;
      const y = height - ((point.close - min) / spread) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price history">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
