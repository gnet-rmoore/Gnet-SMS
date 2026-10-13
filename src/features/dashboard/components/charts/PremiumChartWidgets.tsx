import React, { useId, useMemo } from "react";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import type { ChartDatum } from "../../lib/chartAggregates";
import {
  DASHBOARD_CHART_AXIS,
  DASHBOARD_CHART_GRID,
  DASHBOARD_CHART_TOOLTIP,
  DASHBOARD_CHART_TOOLTIP_FEATURED,
} from "./chartTokens";

const PREMIUM_DONUT = {
  inner: 72,
  outer: 104,
  chartHeight: "h-52",
} as const;

const SEGMENT_BADGE: Record<string, string> = {
  students: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  teachers: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  present: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  absent: "bg-rose-50 text-rose-700 ring-rose-100",
};

function darken(hex: string, amount = 0.12): string {
  const n = hex.replace("#", "");
  if (n.length !== 6) return hex;
  const r = Math.max(0, Math.round(parseInt(n.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(n.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(n.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function segmentBadgeClass(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "");
  for (const [k, cls] of Object.entries(SEGMENT_BADGE)) {
    if (key.includes(k)) return cls;
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function PremiumChartEmpty({
  message,
  icon: Icon = PieChartIcon,
  tall = false,
}: {
  message: string;
  icon?: typeof PieChartIcon;
  tall?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-6 text-center ${
        tall ? "min-h-[14rem]" : "min-h-[13rem]"
      }`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_1px_2px_rgb(15,23,42,0.06),0_4px_12px_rgb(15,23,42,0.04)] ring-1 ring-slate-100">
        <Icon className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
      </div>
      <p className="max-w-xs text-sm leading-relaxed text-slate-500">{message}</p>
    </div>
  );
}

type PremiumDonutChartProps = {
  data: ChartDatum[];
  emptyMessage: string;
  centerLabel: string;
  centerValue?: string;
  centerSubtext?: string;
};

export function PremiumDonutChart({
  data,
  emptyMessage,
  centerLabel,
  centerValue,
  centerSubtext,
}: PremiumDonutChartProps) {
  const uid = useId().replace(/:/g, "");
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  if (data.length === 0 || total === 0) {
    return <PremiumChartEmpty message={emptyMessage} />;
  }

  return (
    <div className="flex flex-col">
      <div className={`relative ${PREMIUM_DONUT.chartHeight} w-full`}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[13.5rem] w-[13.5rem] rounded-full bg-gradient-to-b from-slate-50 to-white shadow-[inset_0_1px_0_rgb(255,255,255,0.9)] ring-1 ring-slate-100/80" />
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((entry, index) => {
                const base = entry.fill || "#6366f1";
                return (
                  <linearGradient
                    key={`${uid}-grad-${index}`}
                    id={`${uid}-grad-${index}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={base} stopOpacity={1} />
                    <stop offset="100%" stopColor={darken(base, 0.14)} stopOpacity={1} />
                  </linearGradient>
                );
              })}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={PREMIUM_DONUT.inner}
              outerRadius={PREMIUM_DONUT.outer}
              paddingAngle={2}
              cornerRadius={6}
              dataKey="value"
              nameKey="name"
              stroke="#ffffff"
              strokeWidth={3}
            >
              {data.map((entry, index) => (
                <Cell key={`premium-donut-${index}`} fill={`url(#${uid}-grad-${index})`} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={DASHBOARD_CHART_TOOLTIP_FEATURED}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {centerLabel}
          </span>
          {centerValue ? (
            <span className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-slate-900">
              {centerValue}
            </span>
          ) : null}
          {centerSubtext ? (
            <span className="mt-0.5 text-xs font-medium text-slate-500">{centerSubtext}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-1 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
        {data.map((entry) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div
              key={entry.name}
              className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-100"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                style={{ backgroundColor: entry.fill || "#6366f1" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-700">{entry.name}</p>
                <p className="font-mono text-[11px] text-slate-500">{pct}% of total</p>
              </div>
              <span className="font-mono text-sm font-extrabold text-slate-900">
                {entry.value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PremiumBarChartProps = {
  data: ChartDatum[];
  emptyMessage: string;
  valueFormatter?: (value: number) => string;
  layout?: "horizontal" | "vertical";
  tall?: boolean;
};

export function PremiumBarChart({
  data,
  emptyMessage,
  valueFormatter,
  layout = "horizontal",
  tall = false,
}: PremiumBarChartProps) {
  const uid = useId().replace(/:/g, "");

  if (data.length === 0) {
    return <PremiumChartEmpty message={emptyMessage} icon={BarChart3} tall={tall} />;
  }

  const formatted = data.map((d) => ({ ...d, label: d.name }));
  const maxValue = Math.max(...formatted.map((d) => d.value), 1);
  const isHorizontal = layout === "horizontal";

  return (
    <div className={tall ? "h-64 w-full sm:h-72" : "h-56 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formatted}
          layout={isHorizontal ? "vertical" : undefined}
          margin={
            isHorizontal
              ? { top: 4, right: 28, left: 4, bottom: 4 }
              : { top: 8, right: 8, left: -8, bottom: 0 }
          }
          barCategoryGap="18%"
        >
          <defs>
            {formatted.map((entry, index) => {
              const base = entry.fill || "#6366f1";
              return (
                <linearGradient
                  key={`${uid}-bar-${index}`}
                  id={`${uid}-bar-${index}`}
                  x1="0"
                  y1="0"
                  x2={isHorizontal ? "1" : "0"}
                  y2={isHorizontal ? "0" : "1"}
                >
                  <stop offset="0%" stopColor={base} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={darken(base, 0.1)} stopOpacity={1} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid
            horizontal={!isHorizontal}
            vertical={isHorizontal}
            strokeDasharray={DASHBOARD_CHART_GRID.strokeDasharray}
            stroke={DASHBOARD_CHART_GRID.stroke}
          />
          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                domain={[0, maxValue * 1.08]}
                stroke={DASHBOARD_CHART_AXIS.stroke}
                fontSize={DASHBOARD_CHART_AXIS.fontSize}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke={DASHBOARD_CHART_AXIS.stroke}
                fontSize={11}
                width={88}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#475569", fontWeight: 600 }}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                stroke={DASHBOARD_CHART_AXIS.stroke}
                fontSize={DASHBOARD_CHART_AXIS.fontSize}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#475569", fontWeight: 600 }}
              />
              <YAxis
                stroke={DASHBOARD_CHART_AXIS.stroke}
                fontSize={DASHBOARD_CHART_AXIS.fontSize}
                tickLine={false}
                axisLine={false}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "rgb(248, 250, 252)", radius: 8 }}
            contentStyle={DASHBOARD_CHART_TOOLTIP}
            formatter={(value: number) =>
              valueFormatter ? valueFormatter(value) : value.toLocaleString()
            }
          />
          <Bar
            dataKey="value"
            radius={isHorizontal ? [0, 10, 10, 0] : [10, 10, 0, 0]}
            barSize={isHorizontal ? 22 : 28}
            background={{ fill: "#f8fafc", radius: isHorizontal ? 10 : 10 }}
          >
            {formatted.map((entry, index) => (
              <Cell key={`premium-bar-${index}`} fill={`url(#${uid}-bar-${index})`} />
            ))}
            <LabelList
              dataKey="value"
              position={isHorizontal ? "right" : "top"}
              className="fill-slate-600"
              fontSize={11}
              fontWeight={700}
              formatter={(value: number) =>
                valueFormatter ? valueFormatter(value) : value.toLocaleString()
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PremiumHorizontalBarChart(props: PremiumBarChartProps) {
  return <PremiumBarChart {...props} layout="horizontal" tall={props.tall ?? true} />;
}

/** Map chart segment names to badge classes for compact footers. */
export { segmentBadgeClass };
