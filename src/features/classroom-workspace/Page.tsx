import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { enrichClassrooms } from "../academics-shared/enrichClassrooms";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { classScheduleApi } from "../class-schedule/api";
import { workspaceApi } from "./api";
import { unwrapItems } from "../../lib/apiEnvelope";
import type { ClassroomSummary } from "./types";
import { ClassRoomCard, durationByClassroom, type ClassDurationInfo } from "./ClassRoomCard";
import { useTranslation } from "react-i18next";

export function ClassroomWorkspaceList() {
  const { t } = useTranslation(["pages", "nav"]);
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [durationMap, setDurationMap] = useState<Map<string, ClassDurationInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Array<{ id: string; name: string }>>([]);

  const isStudent = user?.role === "STUDENT";
  const isTeacher = user?.role === "TEACHER";
  const isParent = user?.role === "PARENT";
  const studentId = searchParams.get("studentId");

  useEffect(() => {
    if (!isParent || !user?.id) return;
    workspaceApi
      .fetchChildren(user.id)
      .then((rows) => {
        const list = (Array.isArray(rows) ? rows : []).map((c: any) => ({
          id: c.id || c.studentId,
          name: c.name || "Student",
        }));
        setChildren(list);
        if (!studentId && list[0]?.id) {
          setSearchParams({ studentId: list[0].id }, { replace: true });
        }
      })
      .catch(() => setChildren([]));
  }, [isParent, user?.id, studentId, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!school?.id) {
        setLoading(false);
        return;
      }
      if (isParent && !studentId) {
        setClassrooms([]);
        setDurationMap(new Map());
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const timetableParams: Record<string, string> = {};
        if (isParent && studentId) timetableParams.studentId = studentId;

        const [rooms, subjects, gradeLevels, staff, timetable] = await Promise.all([
          workspaceApi.fetchMyClassrooms(isParent ? studentId : null),
          workspaceApi.fetchSubjects(school.id),
          workspaceApi.fetchGradeLevels(school.id),
          workspaceApi.fetchStaff(school.id).catch(() => []),
          classScheduleApi.listTimetable(school.id, timetableParams).catch(() => []),
        ]);
        if (cancelled) return;
        setClassrooms(
          enrichClassrooms(Array.isArray(rooms) ? rooms : [], {
            subjects: unwrapItems(subjects),
            gradeLevels: unwrapItems(gradeLevels),
            staff: Array.isArray(staff) ? staff : [],
          })
        );
        setDurationMap(durationByClassroom(Array.isArray(timetable) ? timetable : []));
      } catch (e: any) {
        if (!cancelled) showToast(e?.message || "Could not load classes", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school?.id, showToast, isParent, studentId]);

  const emptyCopy = isParent
    ? {
        title: "No classes for this child",
        body: "When your child is placed in a class during admission or enrollment, it will appear here (read-only).",
      }
    : isStudent
      ? {
          title: "No subjects assigned yet",
          body: "Your school will assign your subjects for your grade level during admission or enrollment.",
        }
      : isTeacher
        ? {
            title: "No classes assigned",
            body: "When an admin assigns you as a teacher on a class group or subject room, it will appear here.",
          }
        : {
            title: "No classes in your membership list",
            body: "Rooms you belong to as a member appear here. Admins manage class groups under Classrooms.",
          };

  const studentSubjectGroups = useMemo(() => {
    if (!isStudent) return [];
    const groups = new Map<
      string,
      { id: string; name: string; rooms: ClassroomSummary[] }
    >();
    for (const room of classrooms) {
      if (!room.subject?.name) continue;
      const id = room.gradeLevelId || room.gradeLevel?.id || "unassigned";
      const group = groups.get(id) || {
        id,
        name:
          room.gradeLevel?.name ||
          t("classroom.gradeLevelFallback", { defaultValue: "Grade level" }),
        rooms: [],
      };
      group.rooms.push(room);
      groups.set(id, group);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms, isStudent, t]);

  const classroomSections = isStudent
    ? studentSubjectGroups
    : [{ id: "all", name: "", rooms: classrooms }];
  const hasVisibleClassrooms = classroomSections.some((section) => section.rooms.length > 0);

  const roomLink = (id: string) =>
    isParent && studentId
      ? `/${slug}/classroom/${id}?studentId=${encodeURIComponent(studentId)}`
      : `/${slug}/classroom/${id}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">{t("nav:items.myClasses")}</h1>
          <p className="text-slate-500 font-medium mt-1">
            {isParent
              ? "Read-only view of your child’s class stream and returned assignment marks."
              : isStudent
                ? "Your subjects are grouped under your grade level."
                : "Open a room to post announcements, assignments, and return student work."}
          </p>
        </div>
        {isParent && children.length > 0 && (
          <div className="min-w-[220px]">
            <label className={fieldLabel}>Child</label>
            <select
              className={`${fieldInput} mt-1.5`}
              value={studentId || ""}
              onChange={(e) => setSearchParams({ studentId: e.target.value })}
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] animate-pulse"
            />
          ))}
        </div>
      ) : !hasVisibleClassrooms ? (
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-slate-400" />
          </div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{emptyCopy.title}</h2>
          <p className="text-sm text-slate-500 font-medium mt-2 max-w-md mx-auto leading-relaxed">
            {emptyCopy.body}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {classroomSections.map((section) => (
            <section key={section.id} className="space-y-4">
              {section.name && (
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    {section.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {t("classroom.subjectsForGradeLevel", {
                      defaultValue: "Subjects for this grade level",
                    })}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.rooms.map((room, index) => (
                  <ClassRoomCard
                    key={room.id}
                    room={room}
                    to={roomLink(room.id)}
                    index={index}
                    duration={durationMap.get(room.id) || null}
                    studentView={isStudent}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
