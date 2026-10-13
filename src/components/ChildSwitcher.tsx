type Child = { id: string; name: string };

export function ChildSwitcher({
  children,
  studentId,
  onChange,
}: {
  children: Child[];
  studentId: string;
  onChange: (studentId: string) => void;
}) {
  if (children.length < 2) return null;

  return (
    <label className="block min-w-[220px]">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Viewing child</span>
      <select
        value={studentId}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
      >
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name}
          </option>
        ))}
      </select>
    </label>
  );
}
