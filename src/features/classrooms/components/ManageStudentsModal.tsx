import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Trash2 } from "lucide-react";
import { FeatureModalShell, fieldInput } from "../../academics-shared/FeatureModalShell";
import { usePagedStudents } from "../../../hooks/usePagedStudents";
import { ListPagination } from "../../../components/ui";

export type ManageStudentsModalProps = {
  allStudents?: any[];
  handleAddStudentToClass?: (id: string) => void;
  handleRemoveStudentFromClass?: (id: string) => void;
  selectedClassGroup?: any;
  setShowManageStudentsModal?: (v: boolean) => void;
  setStudentSearchQuery?: (v: string) => void;
  studentSearchQuery?: string;
};

export function ManageStudentsModal({
  handleAddStudentToClass,
  handleRemoveStudentFromClass,
  selectedClassGroup,
  setShowManageStudentsModal,
  setStudentSearchQuery,
  studentSearchQuery = "",
}: ManageStudentsModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { students, total, loading } = usePagedStudents({
    q: studentSearchQuery,
    page,
    pageSize,
  });

  return (
    <FeatureModalShell
      eyebrow={t("classrooms.manageStudents.title")}
      title={t("classrooms.manageStudents.title")}
      subtitle={t("classrooms.manageStudents.subtitle")}
      onClose={() => setShowManageStudentsModal?.(false)}
      wide
    >
      <div className="px-8 pt-6 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("classrooms.manageStudents.searchPlaceholder")}
            value={studentSearchQuery}
            onChange={(e) => {
              setStudentSearchQuery?.(e.target.value);
              setPage(1);
            }}
            className={`${fieldInput} pl-10`}
          />
        </div>
      </div>

      <div className="px-8 pb-4 space-y-2 max-h-[50vh] overflow-y-auto">
        {loading && students.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            {t("common:loading", { defaultValue: "Loading…" })}
          </div>
        ) : null}
        {students.map((student) => {
          const enrolled = selectedClassGroup?.members?.some(
            (m: any) => m.userId === student.id
          );
          return (
            <div
              key={student.id}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 font-bold border border-slate-100 shrink-0">
                  {(student.name || "?")[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
                  <p className="text-xs text-slate-500 font-medium truncate">{student.email}</p>
                </div>
              </div>
              {enrolled ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
                    {t("classrooms.manageStudents.enrolled", { defaultValue: "Enrolled" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStudentFromClass?.(student.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title={t("classrooms.manageStudents.remove", { defaultValue: "Remove from class" })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddStudentToClass?.(student.id)}
                  className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  {t("classrooms.manageStudents.add", { defaultValue: "Add" })}
                </button>
              )}
            </div>
          );
        })}
        {!loading && students.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            {total === 0
              ? t("classrooms.manageStudents.noneInSchool", {
                  defaultValue: "No students found in this school.",
                })
              : t("classrooms.manageStudents.noMatch", {
                  defaultValue: "No students match your search.",
                })}
          </div>
        )}
      </div>

      <ListPagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        className="mx-8 mb-6 rounded-2xl border border-slate-100"
        alwaysShow={total > 0}
      />
    </FeatureModalShell>
  );
}
