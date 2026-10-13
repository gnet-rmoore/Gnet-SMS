import React, { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Landmark,
  Calendar,
  HandHelping,
  Target,
  Users,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "../../store/authStore";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { fieldInput, fieldLabel } from "../academics-shared/FeatureModalShell";
import { FriendlyDateField } from "../academic-calendar/components/FriendlyDateField";
import { ptaApi } from "./api";
import { useTranslation } from "react-i18next";

type PtaHome = {
  organization: {
    id: string;
    name: string;
    description?: string | null;
    enabled: boolean;
  } | null;
  enabled: boolean;
  officers: Array<{ userId: string; name?: string; email?: string }>;
  meetings: Array<{
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt: string;
    published: boolean;
    goingCount?: number;
    myRsvp?: string | null;
  }>;
  volunteers: Array<{
    id: string;
    title: string;
    description?: string | null;
    slots?: number | null;
    published: boolean;
    signupCount?: number;
    signedUpByMe?: boolean;
  }>;
  campaigns: Array<{
    id: string;
    title: string;
    description?: string | null;
    goalAmount?: number | null;
    raisedAmount?: number;
    currency?: string | null;
    published: boolean;
  }>;
  myMembership?: { role: string } | null;
};

export function PtaPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [data, setData] = useState<PtaHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [orgEnabled, setOrgEnabled] = useState(false);
  const [officerId, setOfficerId] = useState("");

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");

  const [volTitle, setVolTitle] = useState("");
  const [volSlots, setVolSlots] = useState("");

  const [campTitle, setCampTitle] = useState("");
  const [campGoal, setCampGoal] = useState("");

  const isAdmin = user?.role === "SCHOOL_ADMIN";
  const isOfficer = data?.myMembership?.role === "OFFICER";
  const canManage = isAdmin || isOfficer || user?.role === "PRINCIPAL";
  const isParent = user?.role === "PARENT";

  const load = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    setUnavailable(false);
    try {
      const home = (await ptaApi.getHome(school.id)) as PtaHome;
      setData(home);
      setOrgName(home.organization?.name || "Parent-Teacher Association");
      setOrgDesc(home.organization?.description || "");
      setOrgEnabled(Boolean(home.organization?.enabled ?? home.enabled));
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("403") || msg.toLowerCase().includes("not enabled")) {
        setUnavailable(true);
        setData(null);
      } else {
        showToast(msg || t("pta.toast.loadFailed"), "error");
      }
    } finally {
      setLoading(false);
    }
  }, [school?.id, showToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const saveOrg = async () => {
    if (!school?.id) return;
    setSaving(true);
    try {
      await ptaApi.upsert(school.id, {
        name: orgName.trim() || "Parent-Teacher Association",
        description: orgDesc.trim() || null,
        enabled: orgEnabled,
      });
      showToast(orgEnabled ? t("pta.toast.ptaEnabled") : t("pta.toast.settingsSaved"), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("pta.toast.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const appoint = async () => {
    if (!school?.id || !officerId.trim()) return;
    try {
      await ptaApi.appointOfficer(school.id, officerId.trim());
      setOfficerId("");
      showToast(t("pta.toast.officerAppointed"), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("pta.toast.appointFailed"), "error");
    }
  };

  const createMeeting = async () => {
    if (!school?.id || !meetingTitle.trim() || !meetingDate) {
      showToast(t("pta.toast.meetingRequired"), "error");
      return;
    }
    try {
      await ptaApi.createMeeting(school.id, {
        title: meetingTitle.trim(),
        startsAt: new Date(meetingDate).toISOString(),
        location: meetingLocation.trim() || null,
        published: true,
      });
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingLocation("");
      showToast(t("pta.toast.meetingPublished"), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("pta.toast.createMeetingFailed"), "error");
    }
  };

  const createVolunteer = async () => {
    if (!school?.id || !volTitle.trim()) {
      showToast(t("pta.toast.volunteerTitleRequired"), "error");
      return;
    }
    try {
      await ptaApi.createVolunteer(school.id, {
        title: volTitle.trim(),
        slots: volSlots ? Number(volSlots) : null,
        published: true,
      });
      setVolTitle("");
      setVolSlots("");
      showToast(t("pta.toast.volunteerPublished"), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("pta.toast.createVolunteerFailed"), "error");
    }
  };

  const createCampaign = async () => {
    if (!school?.id || !campTitle.trim()) {
      showToast(t("pta.toast.campaignTitleRequired"), "error");
      return;
    }
    try {
      await ptaApi.createCampaign(school.id, {
        title: campTitle.trim(),
        goalAmount: campGoal ? Number(campGoal) : null,
        published: true,
      });
      setCampTitle("");
      setCampGoal("");
      showToast(t("pta.toast.campaignPublished"), "success");
      await load();
    } catch (err: any) {
      showToast(err?.message || t("pta.toast.createCampaignFailed"), "error");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
        <div className="h-40 animate-pulse rounded-[32px] bg-white border border-slate-200" />
      </div>
    );
  }

  if (unavailable || (!data?.organization?.enabled && !canManage && !isAdmin)) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
        <PageToast toast={toast} />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">{t("pages:pta.title")}</h1>
          <p className="mt-1 text-slate-500 font-medium">
            {t("pages:pta.subtitle")}
          </p>
        </div>
        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <Landmark className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t("pages:pta.unavailableTitle")}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {t("pages:pta.unavailableHint")}
          </p>
          <p className="mt-3 text-xs font-medium text-slate-400">{t("common:stubNotAvailable")}</p>
        </div>
        {isAdmin && (
          <AdminSetup
            orgName={orgName}
            setOrgName={setOrgName}
            orgDesc={orgDesc}
            setOrgDesc={setOrgDesc}
            orgEnabled={orgEnabled}
            setOrgEnabled={setOrgEnabled}
            saving={saving}
            onSave={saveOrg}
          />
        )}
      </div>
    );
  }

  const meetings = data?.meetings || [];
  const volunteers = data?.volunteers || [];
  const campaigns = data?.campaigns || [];
  const officers = data?.officers || [];

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
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {data?.organization?.name || t("pta.title")}
          </h1>
          <p className="mt-1 text-slate-500 font-medium">
            {data?.organization?.description || t("pta.subtitle")}
          </p>
        </div>
        {!data?.organization?.enabled && isAdmin && (
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">
            Draft — not visible to parents
          </span>
        )}
      </motion.div>

      {isAdmin && (
        <AdminSetup
          orgName={orgName}
          setOrgName={setOrgName}
          orgDesc={orgDesc}
          setOrgDesc={setOrgDesc}
          orgEnabled={orgEnabled}
          setOrgEnabled={setOrgEnabled}
          saving={saving}
          onSave={saveOrg}
        />
      )}

      {isAdmin && (
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Officers
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className={fieldInput}
              placeholder="Parent user ID"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
            />
            <button
              type="button"
              onClick={appoint}
              className="px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
            >
              Appoint
            </button>
          </div>
          {officers.length === 0 ? (
            <p className="text-sm text-slate-500">No officers appointed yet.</p>
          ) : (
            <ul className="space-y-2">
              {officers.map((o) => (
                <li
                  key={o.userId}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 text-sm"
                >
                  <span className="font-bold text-slate-900">
                    {o.name || o.userId}
                  </span>
                  <button
                    type="button"
                    className="text-rose-600 font-bold text-xs"
                    onClick={async () => {
                      if (!school?.id) return;
                      try {
                        await ptaApi.removeOfficer(school.id, o.userId);
                        showToast(t("pta.toast.officerRemoved"), "success");
                        await load();
                      } catch (err: any) {
                        showToast(err?.message || t("pta.toast.removeFailed"), "error");
                      }
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
            <h3 className="font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Meeting
            </h3>
            <input
              className={fieldInput}
              placeholder="Title"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
            />
            <FriendlyDateField label="Starts" value={meetingDate} onChange={setMeetingDate} />
            <input
              className={fieldInput}
              placeholder="Location (optional)"
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
            />
            <button
              type="button"
              onClick={createMeeting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Publish meeting
            </button>
          </section>
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
            <h3 className="font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Volunteer
            </h3>
            <input
              className={fieldInput}
              placeholder="Title"
              value={volTitle}
              onChange={(e) => setVolTitle(e.target.value)}
            />
            <input
              className={fieldInput}
              placeholder="Slots (optional)"
              value={volSlots}
              onChange={(e) => setVolSlots(e.target.value)}
            />
            <button
              type="button"
              onClick={createVolunteer}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Publish opportunity
            </button>
          </section>
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
            <h3 className="font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Campaign
            </h3>
            <input
              className={fieldInput}
              placeholder="Title"
              value={campTitle}
              onChange={(e) => setCampTitle(e.target.value)}
            />
            <input
              className={fieldInput}
              placeholder="Goal amount (optional)"
              value={campGoal}
              onChange={(e) => setCampGoal(e.target.value)}
            />
            <button
              type="button"
              onClick={createCampaign}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Publish campaign
            </button>
          </section>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" /> Meetings
        </h2>
        {meetings.length === 0 ? (
          <EmptyBlock copy="No published meetings yet." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3"
              >
                <h3 className="font-extrabold tracking-tight text-slate-900">{m.title}</h3>
                <p className="text-sm text-slate-500">
                  {format(new Date(m.startsAt), "MMM d, yyyy · h:mm a")}
                  {m.location ? ` · ${m.location}` : ""}
                </p>
                {m.description && (
                  <p className="text-sm text-slate-600">{m.description}</p>
                )}
                <p className="text-xs font-mono text-slate-400">
                  Going: {m.goingCount ?? 0}
                  {!m.published ? " · Draft" : ""}
                </p>
                {isParent && (
                  <div className="flex flex-wrap gap-2">
                    {(["GOING", "MAYBE", "DECLINED"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={async () => {
                          try {
                            await ptaApi.rsvp(m.id, status);
                            showToast(
                              t("pta.toast.rsvpSuccess", { status: status.toLowerCase() }),
                              "success"
                            );
                            await load();
                          } catch (err: any) {
                            showToast(err?.message || t("pta.toast.rsvpFailed"), "error");
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                          m.myRsvp === status
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-50 text-slate-700 hover:bg-indigo-50"
                        }`}
                      >
                        {status === "GOING"
                          ? "Going"
                          : status === "MAYBE"
                            ? "Maybe"
                            : "Decline"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <HandHelping className="w-5 h-5 text-indigo-600" /> Volunteer
        </h2>
        {volunteers.length === 0 ? (
          <EmptyBlock copy="No volunteer opportunities yet." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {volunteers.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3"
              >
                <h3 className="font-extrabold tracking-tight text-slate-900">{v.title}</h3>
                {v.description && (
                  <p className="text-sm text-slate-600">{v.description}</p>
                )}
                <p className="text-xs font-mono text-slate-400">
                  Signed up: {v.signupCount ?? 0}
                  {v.slots != null ? ` / ${v.slots}` : ""}
                </p>
                {isParent && (
                  <button
                    type="button"
                    disabled={v.signedUpByMe}
                    onClick={async () => {
                      try {
                        await ptaApi.signupVolunteer(v.id);
                        showToast(t("pta.toast.signedUpVolunteer"), "success");
                        await load();
                      } catch (err: any) {
                        showToast(err?.message || t("pta.toast.signupFailed"), "error");
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {v.signedUpByMe ? "Signed up" : "Volunteer"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" /> Campaigns
        </h2>
        {campaigns.length === 0 ? (
          <EmptyBlock copy="No campaigns yet." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2"
              >
                <h3 className="font-extrabold tracking-tight text-slate-900">{c.title}</h3>
                {c.description && (
                  <p className="text-sm text-slate-600">{c.description}</p>
                )}
                <p className="text-sm font-mono text-slate-700">
                  Raised {c.raisedAmount ?? 0}
                  {c.goalAmount != null ? ` / ${c.goalAmount}` : ""}
                  {c.currency ? ` ${c.currency}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {officers.length > 0 && !isAdmin && (
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 mb-4">
            Officers
          </h2>
          <ul className="space-y-2">
            {officers.map((o) => (
              <li key={o.userId} className="text-sm font-medium text-slate-700">
                {o.name || o.email || o.userId}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EmptyBlock({ copy }: { copy: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      {copy}
    </div>
  );
}

function AdminSetup(props: {
  orgName: string;
  setOrgName: (v: string) => void;
  orgDesc: string;
  setOrgDesc: (v: string) => void;
  orgEnabled: boolean;
  setOrgEnabled: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
        PTA settings
      </h2>
      <div>
        <label className={fieldLabel}>Name</label>
        <input
          className={fieldInput}
          value={props.orgName}
          onChange={(e) => props.setOrgName(e.target.value)}
        />
      </div>
      <div>
        <label className={fieldLabel}>Description</label>
        <textarea
          className={fieldInput}
          rows={2}
          value={props.orgDesc}
          onChange={(e) => props.setOrgDesc(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={props.orgEnabled}
          onChange={(e) => props.setOrgEnabled(e.target.checked)}
          className="w-4 h-4 rounded text-indigo-600"
        />
        <span className="text-sm font-bold text-slate-700">
          Enable PTA for parents
        </span>
      </label>
      <button
        type="button"
        disabled={props.saving}
        onClick={props.onSave}
        className="px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
      >
        {props.saving ? "Saving…" : "Save settings"}
      </button>
    </section>
  );
}
