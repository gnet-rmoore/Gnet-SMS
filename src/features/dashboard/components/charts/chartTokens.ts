/** Shared Recharts / dashboard chart visual tokens (Finance reference). */

export type DashboardChartSize = "grid" | "featured";

export const DASHBOARD_CHART_HEIGHT_CLASS: Record<DashboardChartSize, string> = {
  grid: "h-56",
  featured: "h-72",
};

export const DASHBOARD_CHART_HEIGHT_PX: Record<DashboardChartSize, number> = {
  grid: 224,
  featured: 288,
};

export const DASHBOARD_PIE_INNER_RADIUS: Record<DashboardChartSize, number> = {
  grid: 52,
  featured: 55,
};

export const DASHBOARD_PIE_OUTER_RADIUS: Record<DashboardChartSize, number> = {
  grid: 78,
  featured: 75,
};

export const DASHBOARD_DONUT_CHART_HEIGHT_CLASS = "h-44";

export const DASHBOARD_CHART_GRID = {
  stroke: "#f1f5f9",
  strokeDasharray: "3 3",
} as const;

export const DASHBOARD_CHART_AXIS = {
  stroke: "#94a3b8",
  fontSize: 10,
} as const;

export const DASHBOARD_CHART_TOOLTIP = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  fontSize: "12px",
} as const;

export const DASHBOARD_CHART_TOOLTIP_FEATURED = {
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  fontSize: "12px",
} as const;

export const DASHBOARD_CHART_TOOLTIP_COMPACT = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  fontSize: "11px",
} as const;

export const DASHBOARD_CHART_LEGEND = {
  verticalAlign: "top" as const,
  height: 36,
  wrapperStyle: { fontSize: "11px" },
};

export const DASHBOARD_CHART_BAR_RADIUS_VERTICAL: [number, number, number, number] = [6, 6, 0, 0];
export const DASHBOARD_CHART_BAR_RADIUS_HORIZONTAL: [number, number, number, number] = [0, 6, 6, 0];
