import React from "react";
import { useAuthStore } from "../../../store/authStore";
import { Surface, ListPagination, Button } from "../../../components/ui";

type ActivityEvent = {
  id: string;
  occurredAt: string;
  schoolId: string;
  domain: string;
  action: string;
  summary: string;
  level?: string;
};

export function ActivityFeedPanel() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [items, setItems] = React.useState<ActivityEvent[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [domain, setDomain] = React.useState("");
  const [schoolId, setSchoolId] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (domain) q.set("domain", domain);
    if (schoolId.trim()) q.set("schoolId", schoolId.trim());
    void fetch(`/api/super-admin/activity?${q}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d.items) ? d.items : []);
        setTotal(Number(d.total) || 0);
      })
      .finally(() => setLoading(false));
  }, [accessToken, page, domain, schoolId]);

  const exportCsv = async () => {
    const q = new URLSearchParams();
    if (domain) q.set("domain", domain);
    if (schoolId.trim()) q.set("schoolId", schoolId.trim());
    const res = await fetch(`/api/super-admin/activity/export?${q}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "platform-activity.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Surface variant="primary" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Cross-service activity</h2>
          <p className="text-sm text-slate-500 mt-1">
            Money and grade details stay in domain services; this view shows who did what and when.
          </p>
        </div>
        <Button variant="secondary" size="compact" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          value={schoolId}
          onChange={(e) => {
            setSchoolId(e.target.value);
            setPage(1);
          }}
          placeholder="School ID (required for Finance/Academic/Staff/Ops)"
          className="flex-1 min-w-[220px] px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono"
        />
        <select
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm"
        >
          <option value="">All domains</option>
          <option value="IDENTITY">Identity</option>
          <option value="FINANCE">Finance</option>
          <option value="ACADEMIC">Academic</option>
          <option value="STAFF">Staff</option>
          <option value="OPS">Ops</option>
        </select>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading activity…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No activity in this window.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>{item.domain}</span>
                <span>·</span>
                <span className="font-mono normal-case">{item.action}</span>
                <span className="ms-auto font-normal normal-case text-slate-400">
                  {new Date(item.occurredAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-slate-800">{item.summary}</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">school: {item.schoolId}</p>
            </div>
          ))}
        </div>
      )}
      <ListPagination page={page} pageSize={20} total={total} onPageChange={setPage} alwaysShow />
    </Surface>
  );
}
