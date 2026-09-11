import Link from "next/link";

export type ReadinessTrendPoint = {
  id: string;
  estimateBasisPoints: number;
  lowerBasisPoints: number;
  upperBasisPoints: number;
  evidenceLevel: string;
  evidenceCount: number;
  createdAt: string;
};

const chart = {
  width: 720,
  height: 300,
  left: 58,
  right: 28,
  top: 24,
  bottom: 58,
} as const;

const percentTicks = [0, 25, 50, 75, 100] as const;

export function ReadinessTrend({
  history,
  selectedEstimateId,
}: {
  history: ReadinessTrendPoint[];
  selectedEstimateId: string;
}) {
  if (history.length < 2) return null;

  const chronological = [...history].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  const firstTimestamp = new Date(chronological[0]!.createdAt).getTime();
  const lastTimestamp = new Date(chronological.at(-1)!.createdAt).getTime();
  const historyDuration = lastTimestamp - firstTimestamp;
  const points = chronological.map((point, index) => ({
    ...point,
    x:
      chart.left +
      (historyDuration > 0
        ? (new Date(point.createdAt).getTime() - firstTimestamp) /
          historyDuration
        : index / Math.max(1, chronological.length - 1)) *
        plotWidth,
    y: yForBasisPoints(point.estimateBasisPoints, plotHeight),
    lowerY: yForBasisPoints(point.lowerBasisPoints, plotHeight),
    upperY: yForBasisPoints(point.upperBasisPoints, plotHeight),
  }));
  const first = points[0]!;
  const latest = points.at(-1)!;
  const includeAxisTime = sameCalendarDay(first.createdAt, latest.createdAt);
  const description = `${points.length} saved NuraPrep Math readiness estimates from ${formatDate(first.createdAt)} to ${formatDate(latest.createdAt)}. The first estimate was ${formatBasisPoints(first.estimateBasisPoints)} and the latest was ${formatBasisPoints(latest.estimateBasisPoints)}. Vertical ranges show each estimate's internal uncertainty interval.`;

  return (
    <section className="mt-6 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-6 shadow-sm">
      <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
        Saved estimate history
      </p>
      <h2 className="mt-2 font-serif text-3xl">Readiness trend</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52676a]">
        This line connects versioned NuraPrep estimates. It shows how the
        internal model changed as evidence changed; it is not an official ATI
        score trend or proof of learning.
      </p>

      <figure className="mt-5">
        <svg
          role="img"
          aria-label={description}
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-auto w-full"
        >
          <desc>{description}</desc>
          {percentTicks.map((tick) => {
            const y = yForPercent(tick, plotHeight);
            return (
              <g key={tick}>
                <line
                  x1={chart.left}
                  x2={chart.width - chart.right}
                  y1={y}
                  y2={y}
                  stroke="#d8ded9"
                  strokeWidth="1"
                />
                <text
                  x={chart.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#52676a] text-[12px]"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {points.map((point) => (
            <line
              key={`interval-${point.id}`}
              x1={point.x}
              x2={point.x}
              y1={point.upperY}
              y2={point.lowerY}
              stroke="#78a49b"
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}

          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="#116b65"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((point) => {
            const selected = point.id === selectedEstimateId;
            return (
              <circle
                key={`point-${point.id}`}
                cx={point.x}
                cy={point.y}
                r={selected ? 8 : 6}
                fill={selected ? "#f4a261" : "#116b65"}
                stroke="#fffdf8"
                strokeWidth="3"
              />
            );
          })}

          <text
            x={chart.left}
            y={chart.height - 18}
            textAnchor="start"
            className="fill-[#52676a] text-[12px]"
          >
            {formatAxisDate(first.createdAt, includeAxisTime)}
          </text>
          <text
            x={chart.width - chart.right}
            y={chart.height - 18}
            textAnchor="end"
            className="fill-[#52676a] text-[12px]"
          >
            {formatAxisDate(latest.createdAt, includeAxisTime)}
          </text>
        </svg>
        <figcaption className="mt-2 text-xs leading-5 text-[#52676a]">
          Dots are saved point estimates. Vertical bars are internal uncertainty
          intervals. The larger orange dot is the selected snapshot.
        </figcaption>
      </figure>

      <details className="mt-5 rounded-xl bg-[#edf3ef] p-4">
        <summary className="cursor-pointer text-sm font-bold text-[#116b65]">
          View exact estimate history
        </summary>
        <div
          role="region"
          aria-label="Scrollable readiness estimate history"
          tabIndex={0}
          className="mt-4 overflow-x-auto"
        >
          <table
            className="w-full min-w-[620px] border-collapse text-left text-sm"
            aria-label="Exact readiness estimate history"
          >
            <thead>
              <tr>
                <th scope="col" className="border-b border-[#cbd7d0] px-3 py-2">
                  Saved
                </th>
                <th scope="col" className="border-b border-[#cbd7d0] px-3 py-2">
                  Estimate
                </th>
                <th scope="col" className="border-b border-[#cbd7d0] px-3 py-2">
                  Internal interval
                </th>
                <th scope="col" className="border-b border-[#cbd7d0] px-3 py-2">
                  Evidence
                </th>
              </tr>
            </thead>
            <tbody>
              {[...chronological].reverse().map((point) => (
                <tr key={point.id}>
                  <td className="border-b border-[#d8ded9] px-3 py-3">
                    <Link
                      href={`/practice/progress?estimate=${point.id}`}
                      aria-current={
                        point.id === selectedEstimateId ? "page" : undefined
                      }
                      className="font-semibold text-[#116b65] underline-offset-4 hover:underline"
                    >
                      {formatDate(point.createdAt)}
                    </Link>
                  </td>
                  <td className="border-b border-[#d8ded9] px-3 py-3 font-bold tabular-nums">
                    {formatBasisPoints(point.estimateBasisPoints)}
                  </td>
                  <td className="border-b border-[#d8ded9] px-3 py-3 tabular-nums">
                    {formatBasisPoints(point.lowerBasisPoints)}–
                    {formatBasisPoints(point.upperBasisPoints)}
                  </td>
                  <td className="border-b border-[#d8ded9] px-3 py-3">
                    {label(point.evidenceLevel)} · {point.evidenceCount} unique
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function yForBasisPoints(value: number, plotHeight: number) {
  return yForPercent(Math.min(100, Math.max(0, value / 100)), plotHeight);
}

function yForPercent(value: number, plotHeight: number) {
  return chart.top + plotHeight * (1 - value / 100);
}

function formatBasisPoints(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAxisDate(value: string, includeTime: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: includeTime ? "numeric" : undefined,
    minute: includeTime ? "2-digit" : undefined,
  }).format(new Date(value));
}

function sameCalendarDay(left: string, right: string) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function label(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toLocaleUpperCase("en-US"));
}
