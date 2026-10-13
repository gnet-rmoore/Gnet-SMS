import React, { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DASHBOARD_CHART_AXIS,
  DASHBOARD_CHART_GRID,
  DASHBOARD_CHART_HEIGHT_CLASS,
  DASHBOARD_CHART_LEGEND,
  DASHBOARD_CHART_TOOLTIP_FEATURED,
  DASHBOARD_CHART_TOOLTIP_COMPACT,
  DASHBOARD_DONUT_CHART_HEIGHT_CLASS,
  DASHBOARD_PIE_INNER_RADIUS,
  DASHBOARD_PIE_OUTER_RADIUS,
  type DashboardChartSize,
} from "./chartTokens";

export type DashboardAreaSeries = {
  dataKey: string;
  name: string;
  stroke: string;
  gradientStops: { offset: string; color: string; opacity: number }[];
};

type DashboardAreaChartProps = {
  data: Array<Record<string, unknown>>;
  series: DashboardAreaSeries[];
  xKey?: string;
  emptyMessage: string;
  size?: DashboardChartSize;
};

export function DashboardAreaChart({
  data,
  series,
  xKey = "month",
  emptyMessage,
  size = "featured",
}: DashboardAreaChartProps) {
  const uid = useId().replace(/:/g, "");

  if (data.length === 0) {
    return (
      <div
        className={`${DASHBOARD_CHART_HEIGHT_CLASS[size]} flex items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={DASHBOARD_CHART_HEIGHT_CLASS[size]}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.dataKey}
                id={`${uid}-${s.dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                {s.gradientStops.map((stop) => (
                  <stop
                    key={stop.offset}
                    offset={stop.offset}
                    stopColor={stop.color}
                    stopOpacity={stop.opacity}
                  />
                ))}
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray={DASHBOARD_CHART_GRID.strokeDasharray}
            stroke={DASHBOARD_CHART_GRID.stroke}
          />
          <XAxis dataKey={xKey} stroke={DASHBOARD_CHART_AXIS.stroke} fontSize={DASHBOARD_CHART_AXIS.fontSize} />
          <YAxis stroke={DASHBOARD_CHART_AXIS.stroke} fontSize={DASHBOARD_CHART_AXIS.fontSize} />
          <Tooltip contentStyle={DASHBOARD_CHART_TOOLTIP_FEATURED} />
          <Legend
            verticalAlign={DASHBOARD_CHART_LEGEND.verticalAlign}
            height={DASHBOARD_CHART_LEGEND.height}
            wrapperStyle={DASHBOARD_CHART_LEGEND.wrapperStyle}
          />
          {series.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              name={s.name}
              dataKey={s.dataKey}
              stroke={s.stroke}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${uid}-${s.dataKey})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type DashboardDonutFooterItem = {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  badgeClassName?: string;
};

type DashboardDonutChartProps = {
  data: Array<{ value: number; category?: string; name?: string; fill?: string }>;
  nameKey?: string;
  centerLabel?: string;
  centerValue?: string;
  footerItems?: DashboardDonutFooterItem[];
  emptyMessage: string;
  getFill?: (entry: { category?: string; name?: string }, index: number) => string;
  size?: DashboardChartSize;
};

export function DashboardDonutChart({
  data,
  nameKey = "category",
  centerLabel,
  centerValue,
  footerItems,
  emptyMessage,
  getFill,
  size = "featured",
}: DashboardDonutChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <div
          className={`${DASHBOARD_DONUT_CHART_HEIGHT_CLASS} flex items-center justify-center text-center text-sm text-slate-400`}
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  const innerRadius = DASHBOARD_PIE_INNER_RADIUS[size];
  const outerRadius = DASHBOARD_PIE_OUTER_RADIUS[size];

  return (
    <>
      <div className={`relative flex flex-1 items-center justify-center ${DASHBOARD_DONUT_CHART_HEIGHT_CLASS}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              dataKey="value"
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`donut-${index}`}
                  fill={
                    getFill
                      ? getFill(entry, index)
                      : entry.fill || "#6B7280"
                  }
                />
              ))}
            </Pie>
            <Tooltip contentStyle={DASHBOARD_CHART_TOOLTIP_COMPACT} />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel ? (
          <div className="pointer-events-none absolute flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {centerLabel}
            </span>
            {centerValue ? (
              <span className="font-mono text-sm font-extrabold text-slate-800">{centerValue}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {footerItems && footerItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
          {footerItems.map((item) => (
            <div key={item.key} className="flex min-w-0 items-center gap-1.5">
              <span
                className={`max-w-full shrink-0 truncate rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  item.badgeClassName || "bg-slate-100 text-slate-600"
                }`}
              >
                {item.label}
              </span>
              <span className="truncate font-mono text-xs text-slate-500">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
