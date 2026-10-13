export type HeaderAndFiltersProps = {
  categories: string[];
  searchQuery: string;
  selectedCategory: string;
  setSearchQuery: (v: string) => void;
  setSelectedCategory: (v: string) => void;
};

const filterIdleClass =
  "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50";
const filterActiveClass =
  "bg-slate-900 text-white border border-slate-900 shadow-sm";

export function HeaderAndFilters({
  categories,
  searchQuery,
  selectedCategory,
  setSearchQuery,
  setSelectedCategory,
}: HeaderAndFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                active ? filterActiveClass : filterIdleClass
              }`}
            >
              {cat === "all" ? "All events" : cat === "Non-Instruction" ? "Non-inst." : cat}
            </button>
          );
        })}
      </div>
      <input
        type="search"
        placeholder="Search events…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 lg:w-72"
      />
    </div>
  );
}
