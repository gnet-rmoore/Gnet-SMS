import React, { useId } from "react";
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
  LineChart,
  Line,
  Area,
} from "recharts";
import type { ChartDatum } from "../../lib/chartAggregates";
import { DashboardChartEmpty } from "./DashboardChartCard";
import {
  DASHBOARD_CHART_AXIS,
  DASHBOARD_CHART_BAR_RADIUS_HORIZONTAL,
  DASHBOARD_CHART_BAR_RADIUS_VERTICAL,
  DASHBOARD_CHART_GRID,
  DASHBOARD_CHART_HEIGHT_CLASS,
  DASHBOARD_CHART_TOOLTIP,
  DASHBOARD_PIE_INNER_RADIUS,
  DASHBOARD_PIE_OUTER_RADIUS,
  type DashboardChartSize,
} from "./chartTokens";

type SimpleBarChartProps = {
  data: ChartDatum[];
  emptyMessage: string;
  valueFormatter?: (value: number) => string;
  layout?: "horizontal" | "vertical";
  size?: DashboardChartSize;
};

export function SimpleBarChart({
  data,
  emptyMessage,
  valueFormatter,
  layout = "vertical",
  size = "grid",
}: SimpleBarChartProps) {
  if (data.length === 0) {
    return <DashboardChartEmpty message={emptyMessage} size={size} />;
  }

  const formatted = data.map((d) => ({
    ...d,
    label: d.name,
  }));

  const isHorizontal = layout === "horizontal";

  return (
    <div className={`${DASHBOARD_CHART_HEIGHT_CLASS[size]} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formatted}
          layout={isHorizontal ? "vertical" : undefined}
          margin={{ top: 8, right: 8, left: isHorizontal ? 8 : -12, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray={DASHBOARD_CHART_GRID.strokeDasharray}
            stroke={DASHBOARD_CHART_GRID.stroke}
          />
          {isHorizontal ? (
            <>
              <XAxis type="number" stroke={DASHBOARD_CHART_AXIS.stroke} fontSize={DASHBOARD_CHART_AXIS.fontSize} />
              <YAxis
                type="category"
                dataKey="label"
                stroke={DASHBOARD_CHART_AXIS.stroke}
                fontSize={DASHBOARD_CHART_AXIS.fontSize}
                width={72}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="label" stroke={DASHBOARD_CHART_AXIS.stroke} fontSize={DASHBOARD_CHART_AXIS.fontSize} />
              <YAxis stroke={DASHBOARD_CHART_AXIS.stroke} fontSize={DASHBOARD_CHART_AXIS.fontSize} />
            </>
          )}
          <Tooltip
            contentStyle={DASHBOARD_CHART_TOOLTIP}
            formatter={(value: number) =>
              valueFormatter ? valueFormatter(value) : value.toLocaleString()
            }
          />
          <Bar
            dataKey="value"
            radius={isHorizontal ? DASHBOARD_CHART_BAR_RADIUS_HORIZONTAL : DASHBOARD_CHART_BAR_RADIUS_VERTICAL}
          >
            {formatted.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={entry.fill || "#6366f1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type SimplePieChartProps = {
  data: ChartDatum[];
  emptyMessage: string;
  centerLabel?: string;
  centerValue?: string;
  footer?: React.ReactNode;
  size?: DashboardChartSize;
};

export function SimplePieChart({
  data,
  emptyMessage,
  centerLabel,
  centerValue,
  footer,
  size = "grid",
}: SimplePieChartProps) {
  if (data.length === 0) {
    return <DashboardChartEmpty message={emptyMessage} size={size} />;
  }

  const innerRadius = DASHBOARD_PIE_INNER_RADIUS[size];
  const outerRadius = DASHBOARD_PIE_OUTER_RADIUS[size];

  return (
    <div className="space-y-4">
      <div className={`relative ${DASHBOARD_CHART_HEIGHT_CLASS[size]} w-full`}>
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
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`pie-${index}`} fill={entry.fill || "#6366f1"} />
              ))}
            </Pie>
            <Tooltip contentStyle={DASHBOARD_CHART_TOOLTIP} />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {centerLabel}
            </span>
            {centerValue ? (
              <span className="font-mono text-sm font-extrabold text-slate-800">{centerValue}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {footer ? <div className="border-t border-slate-100 pt-4">{footer}</div> : null}
    </div>
  );
}

type SimpleLineChartProps = {
  data: Array<{ name: string; value: number }>;
  emptyMessage: string;
  stroke?: string;
  valueFormatter?: (value: number) => string;
  showAreaFill?: boolean;
  size?: DashboardChartSize;
};

export function SimpleLineChart({
  data,
  emptyMessage,
  stroke = "#6366f1",
  valueFormatter,
  showAreaFill = false,
  size = "grid",
}: SimpleLineChartProps) {
  const uid = useId().replace(/:/g, "");

  if (data.length === 0) {
    return <DashboardChartEmpty message={emptyMessage} size={size} />;
  }

  return (
    <div className={`${DASHBOARD_CHART_HEIGHT_CLASS[size]} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          {showAreaFill ? (
            <defs>
              <linearGradient id={`${uid}-lineFill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.15} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
          ) : null}
          <CartesianGrid
            strokeDasharray={DASHBOARD_CHART_GRID.strokeDasharray}
            stroke={DASHBOARD_CHART_GRID.stroke}
          />
          <XAxis dataKey="name" stroke={DASHBOARD_CHART_AXIS.stroke} fontSize={DASHBOARD_CHART_AXIS.fontSize} />
          <YAxis stroke={DASHBOARD_CHART_AXIS.stroke} fontSize={DASHBOARD_CHART_AXIS.fontSize} />
          <Tooltip
            contentStyle={DASHBOARD_CHART_TOOLTIP}
            formatter={(value: number) =>
              valueFormatter ? valueFormatter(value) : value.toLocaleString()
            }
          />
          {showAreaFill ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${uid}-lineFill)`}
              fillOpacity={1}
            />
          ) : (
            <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={{ r: 3 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
