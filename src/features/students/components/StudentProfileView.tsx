import React from "react";
import {
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  Building,
  GraduationCap,
  Calendar,
  Heart,
  BookOpen,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { SMS_SHADOW_SURFACE } from "../../../components/ui";
import { cn } from "../../../lib/cn";

export type StudentProfileStudent = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  gradeLevelId?: string | null;
  gradeLevel?: { name?: string | null } | null;
  isActive?: boolean;
  createdAt?: string | null;
  standing?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  notes?: string | null;
  classroomMembers?: Array<{
    classroom?: { name?: string | null; room?: string | null } | null;
  }> | null;
};

type InfoRow = { label: string; value: React.ReactNode; mono?: boolean };

function ProfileSection({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        `rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 ${SMS_SHADOW_SURFACE}`,
        className
      )}
    >
      <h4 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-extrabold uppercase tracking-wider text-indigo-600">
        <Icon className="h-4 w-4 shrink-0" />
        {title}
      </h4>
      {children}
    </section>
  );
}

function InfoGrid({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {row.label}
          </dt>
          <dd
            className={cn(
              "text-sm font-extrabold text-slate-900",
              row.mono && "font-mono text-xs break-all"
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatDate(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  try {
    return format(new Date(value), "MMMM d, yyyy");
  } catch {
    return fallback;
  }
}

function formatGender(gender?: string | null, t?: (k: string) => string) {
  if (!gender) return t?.("studentProfile.notSpecified") || "—";
  const key = gender.toLowerCase();
  if (key === "male") return t?.("common:male") || "Male";
  if (key === "female") return t?.("common:female") || "Female";
  if (key === "other") return t?.("common:other") || "Other";
  return gender;
}

export type StudentProfileViewProps = {
  student: StudentProfileStudent;
  gradeLabel?: string;
  showTimeline?: boolean;
  showHealth?: boolean;
  showNotes?: boolean;
  standingLabel?: string;
};

export function StudentProfileView({
  student,
  gradeLabel,
  showTimeline = false,
  showHealth = false,
  showNotes = false,
  standingLabel,
}: StudentProfileViewProps) {
  const { t } = useTranslation(["pages", "common"]);
  const p = (key: string, opts?: Record<string, unknown>) =>
    t(`studentProfile.${key}`, opts);
  const grade =
    gradeLabel ||
    student.gradeLevel?.name ||
    p("unassignedGrade");

  const demographics: InfoRow[] = [
    { label: p("officialName"), value: student.name || "—" },
    { label: p("email"), value: student.email || "—", mono: true },
    { label: p("phone"), value: student.phone || p("noPhone") },
    { label: p("dateOfBirth"), value: formatDate(student.dob, p("noDob")) },
    {
      label: p("gender"),
      value: formatGender(student.gender, t),
    },
    { label: p("grade"), value: grade },
    {
      label: p("address"),
      value: (
        <span className="inline-flex items-start gap-1.5 font-semibold text-slate-800">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          {student.address || p("noAddress")}
        </span>
      ),
    },
  ];

  if (student.createdAt) {
    demographics.push({
      label: p("recordCreated"),
      value: formatDate(student.createdAt),
    });
  }

  const classrooms = student.classroomMembers || [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <ProfileSection icon={User} title={p("demographics")}>
          <InfoGrid rows={demographics} />
        </ProfileSection>

        <ProfileSection icon={Users} title={p("parentContact")}>
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {p("parentName")}
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-900">
                {student.parentName || p("noParent")}
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {p("parentPhone")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-indigo-700">
                <Phone className="h-3.5 w-3.5" />
                {student.parentPhone || p("noParentPhone")}
              </p>
            </div>
            {student.parentEmail ? (
              <div className="md:col-span-2">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  {p("parentEmail")}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <Mail className="h-3.5 w-3.5" />
                  {student.parentEmail}
                </p>
              </div>
            ) : null}
          </div>
        </ProfileSection>

        {showHealth ? (
          <ProfileSection icon={Heart} title={p("healthRecords")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5 text-center">
                <p className="text-xs font-extrabold uppercase tracking-wider text-rose-500">
                  {p("bloodType")}
                </p>
                <p className="mt-1 font-mono text-3xl font-extrabold text-rose-700">
                  {student.bloodType || "—"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border p-5 text-center",
                  student.allergies === "None"
                    ? "border-emerald-100 bg-emerald-50/40"
                    : "border-amber-100 bg-amber-50/40"
                )}
              >
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {p("allergies")}
                </p>
                <p className="mt-2 text-sm font-extrabold text-slate-800">
                  {student.allergies || "—"}
                </p>
              </div>
            </div>
          </ProfileSection>
        ) : null}

        {showNotes && student.notes ? (
          <ProfileSection icon={BookOpen} title={p("registrarNotes")}>
            <p className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm font-medium italic leading-relaxed text-slate-600">
              {student.notes}
            </p>
          </ProfileSection>
        ) : null}
      </div>

      <div className="space-y-6">
        {standingLabel ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {p("standing")}
                </p>
                <p className="text-sm font-extrabold text-slate-900">{standingLabel}</p>
              </div>
            </div>
          </div>
        ) : null}

        <ProfileSection icon={Building} title={p("cohortAssignment")}>
          {classrooms.length > 0 ? (
            <ul className="space-y-2">
              {classrooms.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-2xl border border-indigo-100/60 bg-indigo-50/40 p-4"
                >
                  <div>
                    <p className="text-sm font-extrabold text-indigo-950">
                      {m.classroom?.name || p("unnamedClass")}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-indigo-500">
                      {p("sectionRoom", {
                        room: m.classroom?.room || p("generalRoom"),
                      })}
                    </p>
                  </div>
                  <span className="rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                    {p("enrolled")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Building className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">{p("unassignedCohort")}</p>
              <p className="mt-1 text-xs text-slate-400">{p("unassignedCohortHint")}</p>
            </div>
          )}
        </ProfileSection>

        {showTimeline ? (
          <ProfileSection icon={Clock} title={p("timeline")}>
            <div className="relative space-y-5 border-l border-slate-200 py-1 pl-6">
              {[
                { color: "bg-emerald-500", title: p("milestoneActive"), hint: p("milestoneActiveHint") },
                { color: "bg-indigo-500", title: p("milestoneCohort"), hint: p("milestoneCohortHint") },
                { color: "bg-amber-500", title: p("milestoneAdmissions"), hint: p("milestoneAdmissionsHint") },
              ].map((item) => (
                <div key={item.title} className="relative text-xs">
                  <span
                    className={cn(
                      "absolute -left-[30px] top-0 h-4 w-4 rounded-full border-4 border-white shadow-sm",
                      item.color
                    )}
                  />
                  <p className="font-extrabold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 font-medium text-slate-500">{item.hint}</p>
                </div>
              ))}
            </div>
          </ProfileSection>
        ) : null}

        {student.createdAt ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              {p("onFileSince")}{" "}
              <span className="font-bold text-slate-700">
                {formatDate(student.createdAt)}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
