/** Sidebar geometry & persistence — see docs/SIDEBAR_NAV_OVERHAUL_PLAN.md */

export const SIDEBAR_EXPANDED_PX = 288;
export const SIDEBAR_RAIL_PX = 76;
export const SIDEBAR_MODE_KEY = "sms-sidebar-mode";

export type SidebarMode = "expanded" | "collapsed";

export function readSidebarMode(): SidebarMode {
  try {
    const v = localStorage.getItem(SIDEBAR_MODE_KEY);
    if (v === "collapsed" || v === "expanded") return v;
  } catch {
    /* ignore */
  }
  return "expanded";
}

export function writeSidebarMode(mode: SidebarMode) {
  try {
    localStorage.setItem(SIDEBAR_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}
