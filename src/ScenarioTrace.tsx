import { scenarioPrice, scenarios } from "./engine";
export function ScenarioTrace({ id }: { id: string }) {
  const sc = scenarios.find((s) => s.id === id)!;
  const prices = Array.from({ length: 33 }, (_, i) =>
    scenarioPrice(sc.symbol, (i * 120) / 32, id),
  );
  const lo = Math.min(...prices),
    range = Math.max(...prices) - lo;
  const d = prices
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${((i * 108) / 32).toFixed(1)},${(27 - ((p - lo) / (range || 1)) * 22).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      className="scenario-trace"
      viewBox="0 0 112 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M1 30H111" stroke="currentColor" opacity=".12" />
      <path
        className="trace-base"
        d={d}
        stroke="currentColor"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="trace-synced"
        d={d}
        pathLength="1"
        stroke="currentColor"
        strokeWidth="1.35"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="1"
      >
        <animate attributeName="stroke-dashoffset" values="1;0" dur="6s" repeatCount="indefinite" calcMode="linear" />
      </path>
      <circle className="trace-runner" r="1.55" fill="currentColor">
        <animateMotion
          dur="6s"
          repeatCount="indefinite"
          path={d}
        />
      </circle>
    </svg>
  );
}
