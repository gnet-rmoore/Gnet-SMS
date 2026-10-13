import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Clock, FileText, Users } from "lucide-react";
import { UserAvatar } from "../../components/UserAvatar";
import { getTeachersForClassGroup } from "../classrooms/utils";
import type { ClassroomSummary } from "./types";

export type ClassDurationInfo = {
  /** e.g. "45 min" or "40–50 min" */
  label: string;
  /** e.g. "5× / week" */
  weeklyHint?: string | null;
};

type Props = {
  room: ClassroomSummary;
  to: string;
  index?: number;
  duration?: ClassDurationInfo | null;
};

export function ClassRoomCard({ room, to, index = 0, duration = null }: Props) {
  const teachers = getTeachersForClassGroup(room as any);
  const primaryTeacher = teachers[0] || null;
  const teacherLabel = !primaryTeacher
    ? "No teacher assigned"
    : teachers.length === 1
      ? primaryTeacher.name
      : `${primaryTeacher.name} +${teachers.length - 1}`;

  const kindLabel = room.subject?.name
    ? "Subject room"
    : room.gradeLevel?.name
      ? "Class group"
      : "Classroom";

  const memberCount = room._count?.members ?? 0;
  const postCount = room._count?.posts ?? 0;

  const categoryPills = [kindLabel];
  if (room.subject?.name) categoryPills.push(room.subject.name);
  else if (room.gradeLevel?.name) categoryPills.push(room.gradeLevel.name);

  const metaChips: string[] = [];
  if (room.subject?.name && room.gradeLevel?.name) {
    metaChips.push(room.gradeLevel.name);
  }
  const visibleChips = metaChips.slice(0, 3);
  const extraChips = Math.max(0, metaChips.length - visibleChips.length);

  const durationLine = duration
    ? [duration.label, duration.weeklyHint].filter(Boolean).join(" · ")
    : "Not scheduled";

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
      className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 flex flex-col gap-4 h-full"
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          userId={primaryTeacher?.id}
          name={primaryTeacher?.name || room.name}
          photoUrl={primaryTeacher?.photoUrl}
          size="lg"
          className="shrink-0 ring-2 ring-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 line-clamp-2 leading-snug">
              {room.name}
            </h2>
            {room.classCode ? (
              <span className="shrink-0 text-xs font-mono text-slate-400 pt-0.5">
                {room.classCode}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-500 font-medium mt-0.5 truncate">{teacherLabel}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoryPills.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-2.5 py-1 text-xs font-bold tracking-wider ${
              i === 0 ? "uppercase" : "normal-case"
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3 flex-1">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className={duration ? "text-slate-700" : "text-slate-400"}>{durationLine}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <span className="font-mono text-slate-900">{memberCount}</span>
              {memberCount === 1 ? " member" : " members"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <span className="font-mono text-slate-900">{postCount}</span>
              {postCount === 1 ? " post" : " posts"}
            </span>
          </div>
        </div>

        {visibleChips.length > 0 ? (
          <>
            <div className="border-t border-slate-200/80" />
            <div className="flex flex-wrap gap-1.5">
              {visibleChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  {chip}
                </span>
              ))}
              {extraChips > 0 ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 font-mono">
                  +{extraChips}
                </span>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="pt-1 mt-auto">
        <Link
          to={to}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
        >
          Open class
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.article>
  );
}

/** Build per-classroom duration labels from timetable rows. */
export function durationByClassroom(
  entries: Array<{
    classroomId: string;
    startTime: string | null;
    endTime: string | null;
  }>
): Map<string, ClassDurationInfo> {
  const byRoom = new Map<string, { minutes: number[]; count: number }>();

  for (const e of entries) {
    const mins = hmDurationMinutes(e.startTime, e.endTime);
    if (mins == null) continue;
    const cur = byRoom.get(e.classroomId) || { minutes: [], count: 0 };
    cur.minutes.push(mins);
    cur.count += 1;
    byRoom.set(e.classroomId, cur);
  }

  const out = new Map<string, ClassDurationInfo>();
  for (const [id, { minutes, count }] of byRoom) {
    const unique = [...new Set(minutes)].sort((a, b) => a - b);
    const label =
      unique.length === 1 ? `${unique[0]} min` : `${unique[0]}–${unique[unique.length - 1]} min`;
    out.set(id, {
      label,
      weeklyHint: count > 0 ? `${count}× / week` : null,
    });
  }
  return out;
}

function hmDurationMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const sm = parseHm(start);
  const em = parseHm(end);
  if (sm == null || em == null || em <= sm) return null;
  return em - sm;
}

function parseHm(hm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
