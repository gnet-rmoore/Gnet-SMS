import React from "react";
import { Edit, Trash2, Eye, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, ListFilterBar, DataTable, dataTableClass } from "../../../components/ui";
import { UserAvatar } from "../../../components/UserAvatar";
import type { FilterFieldDef, UseListFiltersResult } from "../../list-filters";

export type DirectoryTabProps = {
  filteredStudents: any[];
  gradeLevels: any[];
  handleDeleteStudent: (id: string) => void;
  handleOpenEditStudent: (student: any) => void;
  setSelectedStudent: (student: any) => void;
  filterFields: FilterFieldDef[];
  filters: UseListFiltersResult;
  savedViewsScope?: string;
};

export function DirectoryTab({
  filteredStudents,
  gradeLevels,
  handleDeleteStudent,
  handleOpenEditStudent,
  setSelectedStudent,
  filterFields,
  filters,
  savedViewsScope,
}: DirectoryTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
        <ListFilterBar
          fields={filterFields}
          q={filters.q}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={filters.clear}
          searchPlaceholder={t("admissions.directory.searchPlaceholder")}
          shownCount={filteredStudents.length}
          savedViewsScope={savedViewsScope}
        />
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
        <DataTable>
          <table className={dataTableClass.table}>
            <thead className={dataTableClass.thead}>
              <tr>
                <th className={dataTableClass.th}>Student</th>
                <th className={dataTableClass.th}>Grade</th>
                <th className={dataTableClass.th}>Guardian</th>
                <th className={dataTableClass.th}>Status</th>
                <th className={dataTableClass.th}>Actions</th>
              </tr>
            </thead>
            <tbody className={dataTableClass.tbody}>
              {filteredStudents.map((student) => {
                const gl = gradeLevels.find((g) => g.id === student.gradeLevelId);
                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          userId={student.id}
                          name={student.name}
                          photoUrl={student.photoUrl}
                          size="sm"
                          rounded="2xl"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
                          <p className="text-xs text-slate-500 font-medium truncate">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${dataTableClass.td} text-sm font-semibold text-slate-600`}>
                      <span className="truncate block">{gl?.name || "—"}</span>
                    </td>
                    <td className={dataTableClass.td}>
                      <p className="text-sm font-semibold text-slate-700 truncate">{student.parentName || "—"}</p>
                      <p className="text-xs text-slate-500 font-medium truncate">{student.parentPhone || ""}</p>
                    </td>
                    <td className={dataTableClass.td}>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          student.isActive !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {student.isActive !== false ? t("common:active") : t("common:inactive")}
                      </span>
                    </td>
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          onClick={() => setSelectedStudent(student)}
                          className="p-2 min-h-0 text-slate-400 hover:text-slate-700"
                          title={t("admissions.directory.openDossier")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          onClick={() => handleOpenEditStudent(student)}
                          className="p-2 min-h-0 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                          title={t("common:edit")}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 min-h-0 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title={t("common:delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className={dataTableClass.tdEmpty}>
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                    <p className="text-sm font-semibold">No students match these filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTable>
      </div>
    </div>
  );
}
