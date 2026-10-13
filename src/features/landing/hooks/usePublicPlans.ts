import React from "react";
import {
  FALLBACK_PUBLIC_PLANS,
  type PublicPlanCard,
} from "../content/plans";

type UsePublicPlansOptions = {
  /** When false, skip network fetch (parent already loaded plans). */
  enabled?: boolean;
};

/**
 * Shared fetch for `GET /api/public/plans` with static catalog fallback.
 */
export function usePublicPlans({ enabled = true }: UsePublicPlansOptions = {}) {
  const [plans, setPlans] = React.useState<PublicPlanCard[]>([]);
  const [loading, setLoading] = React.useState(enabled);

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/public/plans");
        if (!res.ok) throw new Error("plans unavailable");
        const data = (await res.json()) as PublicPlanCard[];
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setPlans([...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
          return;
        }
      } catch {
        /* fall through to static catalog */
      }
      if (!cancelled) setPlans(FALLBACK_PUBLIC_PLANS);
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { plans, loading };
}
