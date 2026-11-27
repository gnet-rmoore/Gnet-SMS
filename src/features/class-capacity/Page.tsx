import React from "react";
import { useTranslation } from "react-i18next";
import { Button, PageHeader, PageShell, Surface } from "../../components/ui";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useAuthStore } from "../../store/authStore";
import { classroomsApi } from "../classrooms/api";
import { canonicalGradeName } from "../academics-shared/gradeSubjectLabels";

type ClassroomRow = {
  id: string;
  name: string;
  gradeLevelId?: string | null;
  gradeLevel?: { id?: string; name?: string } | null;
  capacity?: number | null;
  allowOverfill?: boolean;
  studentCount?: number;
  seatsLeft?: number | null;
};

type CapacityDraft = {
  capacity: string;
  allowOverfill: boolean;
};

function draftFor(classroom: ClassroomRow): CapacityDraft {
  return {
    capacity: classroom.capacity == null ? "" : String(classroom.capacity),
    allowOverfill: Boolean(classroom.allowOverfill),
  };
}

function isClassroomFull(classroom: ClassroomRow): boolean {
  if (classroom.allowOverfill) return false;
  if (typeof classroom.seatsLeft === "number") return classroom.seatsLeft <= 0;
  return (
    typeof classroom.capacity === "number" &&
    typeof classroom.studentCount === "number" &&
    classroom.studentCount >= classroom.capacity
  );
}

export function ClassCapacityPage() {
  const { t } = useTranslation(["pages", "common", "nav"]);
  const schoolId = useAuthStore((state) => state.school?.id || "");
  const { toast, showToast } = usePageToast();
  const [classrooms, setClassrooms] = React.useState<ClassroomRow[]>([]);
  const [drafts, setDrafts] = React.useState<Record<string, CapacityDraft>>({});
  const [loading, setLoading] = React.useState(false);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const rows = await classroomsApi.fetchClassrooms(schoolId);
      const homerooms = (Array.isArray(rows) ? rows : []).filter(
        (row: any) => !row.subjectId
      ) as ClassroomRow[];
      homerooms.sort((a, b) => {
        const gradeA = canonicalGradeName(a.gradeLevel?.name);
        const gradeB = canonicalGradeName(b.gradeLevel?.name);
        return gradeA.localeCompare(gradeB) || a.name.localeCompare(b.name);
      });
      setClassrooms(homerooms);
      setDrafts(
        Object.fromEntries(homerooms.map((classroom) => [classroom.id, draftFor(classroom)]))
      );
    } catch (err: any) {
      showToast(
        err?.response?.data?.error ||
          t("pages:classCapacity.loadFailed", { defaultValue: "Could not load class capacities." }),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, showToast, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = (classroomId: string, partial: Partial<CapacityDraft>) => {
    setDrafts((current) => ({
      ...current,
      [classroomId]: {
        capacity: current[classroomId]?.capacity ?? "",
        allowOverfill: current[classroomId]?.allowOverfill ?? false,
        ...partial,
      },
    }));
  };

  const save = async (classroom: ClassroomRow) => {
    const draft = drafts[classroom.id] ?? draftFor(classroom);
    const raw = draft.capacity.trim();
    let capacity: number | null = null;
    if (raw !== "") {
      capacity = Number(raw);
      if (!Number.isInteger(capacity) || capacity < 1) {
        showToast(
          t("pages:classCapacity.invalidCapacity", {
            defaultValue: "Capacity must be a whole number of 1 or more, or blank for unlimited.",
          }),
          "error"
        );
        return;
      }
    }

    setSavingId(classroom.id);
    try {
      await classroomsApi.updateCapacity(classroom.id, {
        capacity,
        allowOverfill: draft.allowOverfill,
      });
      showToast(
        t("pages:classCapacity.saved", { defaultValue: "Class capacity saved." }),
        "success"
      );
      await load();
    } catch (err: any) {
      showToast(
        err?.response?.data?.error ||
          t("pages:classCapacity.saveFailed", { defaultValue: "Could not save class capacity." }),
        "error"
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <PageShell>
      <PageToast toast={toast} />
      <PageHeader
        title={t("nav:items.classCapacity")}
        subtitle={t("pages:classCapacity.subtitle", {
          defaultValue:
            "Set how many students each class group accepts. Online applicants cannot choose a full class; leave capacity blank for unlimited.",
        })}
        actions={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            {t("common:refresh")}
          </Button>
        }
      />

      <Surface className="p-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-4">
                  {t("pages:classCapacity.classGroup", { defaultValue: "Class group" })}
                </th>
                <th className="pb-3 pr-4">
                  {t("pages:classCapacity.grade", { defaultValue: "Grade" })}
                </th>
                <th className="pb-3 pr-4">
                  {t("pages:classCapacity.enrolled", { defaultValue: "Enrolled" })}
                </th>
                <th className="pb-3 pr-4">
                  {t("pages:classCapacity.limit", { defaultValue: "Student limit" })}
                </th>
                <th className="pb-3 pr-4">
                  {t("pages:classCapacity.overfill", { defaultValue: "Allow overfill" })}
                </th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classrooms.map((classroom) => {
                const draft = drafts[classroom.id] ?? draftFor(classroom);
                const full = isClassroomFull(classroom);
                return (
                  <tr key={classroom.id} className="align-middle">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{classroom.name}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {canonicalGradeName(classroom.gradeLevel?.name) || "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      <span>{classroom.studentCount ?? 0}</span>
                      {full ? (
                        <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                          {t("pages:classCapacity.full", { defaultValue: "Full" })}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={draft.capacity}
                        onChange={(event) =>
                          patchDraft(classroom.id, { capacity: event.target.value })
                        }
                        placeholder={t("pages:classCapacity.unlimited", {
                          defaultValue: "Unlimited",
                        })}
                        className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="checkbox"
                        checked={draft.allowOverfill}
                        onChange={(event) =>
                          patchDraft(classroom.id, { allowOverfill: event.target.checked })
                        }
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        aria-label={t("pages:classCapacity.overfill", {
                          defaultValue: "Allow overfill",
                        })}
                      />
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="compact"
                        onClick={() => void save(classroom)}
                        loading={savingId === classroom.id}
                      >
                        {t("common:save")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!loading && classrooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {t("pages:classCapacity.empty", {
                      defaultValue: "No class groups yet. Create them under Classrooms first.",
                    })}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Surface>
    </PageShell>
  );
}

export default ClassCapacityPage;
