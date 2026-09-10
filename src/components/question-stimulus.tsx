import type { QuestionStimulus as QuestionStimulusValue } from "@/lib/questions/contracts";

type BarGraphStimulus = Extract<QuestionStimulusValue, { type: "graph" }>;

const chart = {
  width: 640,
  height: 360,
  left: 72,
  right: 24,
  top: 44,
  bottom: 88,
} as const;

export function QuestionStimulus({
  stimulus,
}: {
  stimulus: QuestionStimulusValue | null | undefined;
}) {
  if (!stimulus) return null;

  if (stimulus.type === "graph") {
    return <BarGraph stimulus={stimulus} />;
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-xs font-semibold text-[#52676a]">
          {stimulus.caption}
        </caption>
        <thead>
          <tr>
            {stimulus.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border border-[#d8ded9] bg-[#edf3ef] px-3 py-2"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stimulus.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${rowIndex}-${cellIndex}`}
                  className="border border-[#d8ded9] px-3 py-2"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarGraph({ stimulus }: { stimulus: BarGraphStimulus }) {
  const { bars, title, xAxisLabel, yAxisLabel } = stimulus.data;
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  const slotWidth = plotWidth / bars.length;
  const barWidth = Math.min(64, slotWidth * 0.62);
  const ticks = buildTicks(Math.max(...bars.map((bar) => bar.value)));
  const maximum = ticks.at(-1) ?? 1;
  const positionedTicks = ticks.map((value) => ({
    value,
    y: chart.top + plotHeight * (1 - value / maximum),
  }));
  const renderedBars = bars.map((bar, index) => {
    const height = (bar.value / maximum) * plotHeight;
    const x = chart.left + index * slotWidth + (slotWidth - barWidth) / 2;
    return {
      bar,
      height,
      x,
      y: chart.top + plotHeight - height,
    };
  });

  return (
    <figure className="mt-5 rounded-xl border border-[#d8ded9] bg-white p-3 sm:p-5">
      <svg
        role="img"
        aria-label={stimulus.accessibleDescription}
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className="h-auto w-full"
      >
        <desc>{stimulus.accessibleDescription}</desc>
        <text
          x={chart.width / 2}
          y="20"
          textAnchor="middle"
          className="fill-[#15383a] text-[15px] font-bold"
        >
          {title}
        </text>
        {positionedTicks.map((tick) => (
          <line
            key={`line-${tick.value}`}
            x1={chart.left}
            x2={chart.width - chart.right}
            y1={tick.y}
            y2={tick.y}
            stroke="#d8ded9"
            strokeWidth="1"
          />
        ))}
        {positionedTicks.map((tick) => (
          <text
            key={`label-${tick.value}`}
            x={chart.left - 10}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-[#405b5e] text-[12px]"
          >
            {formatTick(tick.value)}
          </text>
        ))}
        <line
          x1={chart.left}
          x2={chart.left}
          y1={chart.top}
          y2={chart.top + plotHeight}
          stroke="#52676a"
          strokeWidth="2"
        />
        <line
          x1={chart.left}
          x2={chart.width - chart.right}
          y1={chart.top + plotHeight}
          y2={chart.top + plotHeight}
          stroke="#52676a"
          strokeWidth="2"
        />
        {renderedBars.map(({ bar, height, x, y }) => (
          <rect
            key={`bar-${bar.label}`}
            x={x}
            y={y}
            width={barWidth}
            height={height}
            rx="5"
            fill="#2c7f78"
          />
        ))}
        {renderedBars.map(({ bar, x, y }) => (
          <text
            key={`value-${bar.label}`}
            x={x + barWidth / 2}
            y={Math.min(chart.top + plotHeight - 6, y + 17)}
            textAnchor="middle"
            className="fill-white text-[13px] font-bold"
          >
            {formatTick(bar.value)}
          </text>
        ))}
        {renderedBars.map(({ bar, x }) => (
          <text
            key={`category-${bar.label}`}
            x={x + barWidth / 2}
            y={chart.top + plotHeight + 22}
            textAnchor="middle"
            className="fill-[#405b5e] text-[12px]"
          >
            {shortLabel(bar.label)}
          </text>
        ))}
        <text
          x={chart.left + plotWidth / 2}
          y={chart.height - 16}
          textAnchor="middle"
          className="fill-[#15383a] text-[13px] font-semibold"
        >
          {xAxisLabel}
        </text>
        <text
          x="18"
          y={chart.top + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 18 ${chart.top + plotHeight / 2})`}
          className="fill-[#15383a] text-[13px] font-semibold"
        >
          {yAxisLabel}
        </text>
      </svg>
      <figcaption className="mt-2 text-xs leading-5 text-[#52676a]">
        {stimulus.accessibleDescription}
      </figcaption>
      <details className="mt-3 rounded-lg bg-[#edf3ef] p-3 text-sm">
        <summary className="cursor-pointer font-bold text-[#116b65]">
          View graph data as a table
        </summary>
        <table className="mt-3 w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th scope="col" className="border border-[#cbd7d0] px-3 py-2">
                {xAxisLabel}
              </th>
              <th scope="col" className="border border-[#cbd7d0] px-3 py-2">
                {yAxisLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.label}>
                <td className="border border-[#cbd7d0] px-3 py-2">
                  {bar.label}
                </td>
                <td className="border border-[#cbd7d0] px-3 py-2">
                  {formatTick(bar.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function niceCeiling(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const factor =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

function buildTicks(maximumValue: number) {
  const step = niceCeiling(maximumValue / 5);
  const maximum = Math.max(step, Math.ceil(maximumValue / step) * step);
  return Array.from(
    { length: Math.round(maximum / step) + 1 },
    (_, index) => index * step,
  );
}

function formatTick(value: number) {
  return Number.parseFloat(value.toFixed(2)).toLocaleString("en-US");
}

function shortLabel(value: string) {
  return value.length <= 14 ? value : `${value.slice(0, 12)}…`;
}
