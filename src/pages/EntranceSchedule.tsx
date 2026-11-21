import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  FileQuestion,
  Info,
  MapPin,
} from "lucide-react";
import { LanguageSelect } from "../i18n/LanguageSelect";
import { getStoredLocale, normalizeLocale } from "../i18n";
import { translateApiError } from "../i18n/apiErrors";
import type { AppLocale } from "../i18n/locales";
import { ErrorPageShell } from "../components/errors/ErrorPageShell";
import { PublicApplyBackground } from "./PublicApplyBackground";
import {
  PUBLIC_PORTAL_COLUMN,
  PUBLIC_PORTAL_FORM_CARD,
  PUBLIC_PORTAL_PAGE,
} from "../lib/publicPortalLayout";
import { buildStatusUrl } from "../lib/publicApplyStatus";
import { alertError, alertSuccess, confirmAction } from "../lib/swal";

type EntranceSlot = {
  id: string;
  startAt: string;
  endAt: string;
  location: string;
  instructions: string;
  capacity: number;
  seatsLeft: number;
};

type EntranceBooking = {
  slotId: string;
  startAt: string;
  endAt: string;
  location: string;
};

type EntranceAvailability = {
  from: string | null;
  to: string | null;
  weekdays: number[];
  note: string | null;
};

type EntrancePayload = {
  schoolName: string;
  studentName: string;
  gradeLevelName: string;
  deadline: string | null;
  availability: EntranceAvailability | null;
  canReschedule: boolean;
  booking: EntranceBooking | null;
  slots: EntranceSlot[];
  statusUrl: string;
};

type MutationResponse = {
  ok?: boolean;
  booking?: EntranceBooking | null;
  slots?: EntranceSlot[];
  error?: string;
  code?: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateTime = (value: string) => `${formatDate(value)} · ${formatTime(value)}`;

const formatDateOnly = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const weekdayLabels = (days: number[], locale: string) =>
  days
    .slice()
    .sort((a, b) => a - b)
    .map((day) =>
      new Date(Date.UTC(2024, 0, 7 + day)).toLocaleDateString(locale, {
        weekday: "long",
        timeZone: "UTC",
      })
    )
    .join(", ");

export default function EntranceSchedulePage() {
  const { slug = "", token = "" } = useParams();
  const { t, i18n } = useTranslation(["public", "common"]);
  const [data, setData] = React.useState<EntrancePayload | null>(null);
  const [error, setError] = React.useState("");
  const [notFound, setNotFound] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busySlotId, setBusySlotId] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<AppLocale>(
    () => normalizeLocale(i18n.language) || getStoredLocale() || "en"
  );

  const loadEntrance = React.useCallback(async () => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/public/entrance/${encodeURIComponent(token)}`);
      if (res.status === 404) {
        setNotFound(true);
        setData(null);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        throw new Error(translateApiError(json) || json.error || "Could not load entrance dates");
      }
      setData(json as EntrancePayload);
    } catch (err: any) {
      setError(translateApiError(err) || err.message || "Could not load entrance dates");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void loadEntrance();
  }, [loadEntrance]);

  const groups = React.useMemo(() => {
    const byDate = new Map<string, EntranceSlot[]>();
    for (const slot of data?.slots || []) {
      const label = formatDate(slot.startAt);
      const list = byDate.get(label) || [];
      list.push(slot);
      byDate.set(label, list);
    }
    return Array.from(byDate, ([label, slots]) => ({ label, slots }));
  }, [data?.slots]);

  const mutationErrorMessage = (json: MutationResponse, code: string, fallback: string) => {
    if (json.code === code || json.code === "ENTRANCE_SLOT_FULL") {
      return t("public:entrance.slotFull", "This time slot is now full. Please choose another one.");
    }
    if (json.code === "ENTRANCE_OUTSIDE_AVAILABILITY") {
      return t(
        "public:entrance.outsideAvailability",
        "This date is outside the school's available entrance dates."
      );
    }
    if (json.code === "ENTRANCE_SLOT_PAST") {
      return t("public:entrance.pastSlot", "This date has already passed. Please choose another one.");
    }
    return translateApiError(json) || json.error || fallback;
  };

  const mutateBooking = async (path: "book" | "reschedule" | "cancel", slotId?: string) => {
    setError("");
    if (slotId) setBusySlotId(slotId);
    try {
      const res = await fetch(`/api/public/entrance/${encodeURIComponent(token)}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slotId ? { slotId } : {}),
      });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = (await res.json()) as MutationResponse;
      if (!res.ok || !json.ok) {
        const message = mutationErrorMessage(
          json,
          "ENTRANCE_SLOT_FULL",
          t("public:entrance.saveFailed", "Could not save your entrance date.")
        );
        setError(message);
        await alertError(t("public:entrance.saveFailedTitle", "Could not save your date"), message);
        if (json.code === "ENTRANCE_SLOT_FULL") await loadEntrance();
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              slots: Array.isArray(json.slots) ? json.slots : prev.slots,
              booking: path === "cancel" ? null : json.booking ?? prev.booking,
            }
          : prev
      );
      const title =
        path === "cancel"
          ? t("public:entrance.cancelledTitle", "Entrance date cancelled")
          : t("public:entrance.bookedTitle", "Entrance date confirmed");
      const text =
        path === "cancel"
          ? t("public:entrance.cancelledText", "You can choose a new date at any time before the deadline.")
          : t("public:entrance.bookedText", "Your entrance date has been saved. The school has been notified.");
      await alertSuccess(title, text);
    } catch (err: any) {
      const message =
        translateApiError(err) ||
        err.message ||
        t("public:entrance.saveFailed", "Could not save your entrance date.");
      setError(message);
      await alertError(t("public:entrance.saveFailedTitle", "Could not save your date"), message);
    } finally {
      setBusySlotId(null);
    }
  };

  const cancelBooking = async () => {
    const confirmed = await confirmAction({
      title: t("public:entrance.cancelTitle", "Cancel this entrance date?"),
      text: t("public:entrance.cancelText", "Your seat will be released so another applicant can take it."),
      danger: true,
      confirmText: t("public:entrance.cancelAction", "Cancel my date"),
      cancelText: t("common:cancel", "Cancel"),
    });
    if (confirmed) await mutateBooking("cancel");
  };

  const langSelect = (
    <LanguageSelect
      id="public-entrance-lang"
      value={locale}
      onChange={setLocale}
      applyImmediately
      hint={null}
      variant="glass"
      compactOptions
      className="w-44 shrink-0"
    />
  );

  if (notFound) {
    return (
      <ErrorPageShell
        langId="public-entrance-invalid-lang"
        tone="slate"
        icon={FileQuestion}
        code="404"
        eyebrow={t("public:errorPages.notFound.eyebrow", "Page not found")}
        title={t("public:entrance.invalidTitle", "This entrance link is no longer valid")}
        body={t(
          "public:entrance.invalidBody",
          "The link may have expired or already been used. Please contact the school for a new scheduling link."
        )}
        hints={[
          {
            icon: Info,
            text: t("public:entrance.invalidHint", "Ask the registrar to send you a new entrance link."),
          },
        ]}
        primary={{ to: buildStatusUrl(slug), label: t("public:entrance.checkStatus", "Check my admission status") }}
        secondary={{ to: "/", label: t("public:errorPages.goHome", "Back to home") }}
        footerNote={t("public:errorPages.footerNote", "")}
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <PublicApplyBackground className="pointer-events-none absolute inset-0" />
        <div className="relative z-10 flex min-h-screen items-center justify-center text-sm font-semibold text-white drop-shadow-sm">
          {t("public:entrance.loading", "Loading entrance dates…")}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <PublicApplyBackground className="pointer-events-none absolute inset-0" />
        <div className={PUBLIC_PORTAL_PAGE}>
          <div className={`${PUBLIC_PORTAL_COLUMN} space-y-4`}>
            <div className="flex justify-end">{langSelect}</div>
            <div className={PUBLIC_PORTAL_FORM_CARD}>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {t("public:entrance.title", "Choose your entrance date")}
              </h1>
              <p className="mt-2 text-sm font-medium text-rose-600">
                {error || t("public:entrance.loadFailed", "Could not load entrance dates. Please try again.")}
              </p>
              <button
                type="button"
                onClick={() => void loadEntrance()}
                className="mt-4 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                {t("common:retry", "Retry")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusLink = data.statusUrl ? (
    <a
      href={data.statusUrl}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
    >
      {t("public:entrance.checkStatus", "Check my admission status")}
    </a>
  ) : null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PublicApplyBackground className="pointer-events-none absolute inset-0" />
      <div className={PUBLIC_PORTAL_PAGE}>
        <div className={`${PUBLIC_PORTAL_COLUMN} space-y-5`}>
          <div className="flex items-start justify-between gap-3">
            <Link
              to={buildStatusUrl(slug)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur-md hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("public:entrance.checkStatus", "Check my admission status")}
            </Link>
            <div className="shrink-0 self-start">{langSelect}</div>
          </div>

          <div className={`${PUBLIC_PORTAL_FORM_CARD} space-y-6`}>
            <header className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                {data.schoolName}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {t("public:entrance.title", "Choose your entrance date")}
              </h1>
              <p className="text-sm font-medium text-slate-600">
                {[data.studentName, data.gradeLevelName].filter(Boolean).join(" · ")}
              </p>
              {data.deadline ? (
                <p className="text-xs font-semibold text-amber-700">
                  {t("public:entrance.deadline", "Please book by {{date}}.", {
                    date: formatDate(data.deadline),
                  })}
                </p>
              ) : null}
            </header>

            {data.availability ? (
              <section className="space-y-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs font-medium text-slate-600">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {t("public:entrance.availabilityTitle", "School entrance availability")}
                </p>
                {data.availability.from || data.availability.to ? (
                  <p>
                    {t("public:entrance.availabilityRange", "Entrance dates: {{from}} – {{to}}", {
                      from: data.availability.from
                        ? formatDateOnly(data.availability.from)
                        : t("public:entrance.openEnded", "open"),
                      to: data.availability.to
                        ? formatDateOnly(data.availability.to)
                        : t("public:entrance.openEnded", "open"),
                    })}
                  </p>
                ) : null}
                {data.availability.weekdays.length > 0 ? (
                  <p>
                    {t("public:entrance.availabilityWeekdays", "Available days: {{days}}", {
                      days: weekdayLabels(data.availability.weekdays, locale),
                    })}
                  </p>
                ) : null}
                {data.availability.note ? (
                  <p className="leading-relaxed text-slate-700">
                    {t("public:entrance.availabilityNote", "School note: {{note}}", {
                      note: data.availability.note,
                    })}
                  </p>
                ) : null}
              </section>
            ) : null}

            {data.booking ? (
              <section className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CalendarDays className="h-4 w-4" />
                  {t("public:entrance.bookingTitle", "Your scheduled entrance")}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDateTime(data.booking.startAt)} – {formatTime(data.booking.endAt)}
                </p>
                {data.booking.location ? (
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {data.booking.location}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  {statusLink}
                  <button
                    type="button"
                    onClick={() => void cancelBooking()}
                    className="text-sm font-bold text-rose-600 hover:text-rose-700"
                  >
                    {t("public:entrance.cancel", "Cancel this date")}
                  </button>
                </div>
              </section>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                {error}
              </p>
            ) : null}

            {data.booking && !data.canReschedule ? (
              <p className="text-sm font-medium text-slate-500">
                {t(
                  "public:entrance.noReschedule",
                  "Your entrance date is booked and cannot be changed here."
                )}
              </p>
            ) : (
              <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {data.booking
                    ? t("public:entrance.changeTitle", "Choose another date")
                    : t("public:entrance.slotsTitle", "Available entrance dates")}
                </h2>
                {groups.length === 0 ? (
                  <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-600">
                    {t(
                      "public:entrance.noSlots",
                      "No entrance dates are available right now. Please contact the school."
                    )}
                  </p>
                ) : null}
                {groups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <CalendarDays className="h-4 w-4 text-indigo-500" />
                      {group.label}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {group.slots.map((slot) => {
                        const full = slot.seatsLeft !== null && slot.seatsLeft <= 0;
                        const busy = busySlotId === slot.id;
                        return (
                          <div
                            key={slot.id}
                            className={`space-y-2 rounded-2xl border p-4 ${
                              full ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                                <Clock className="h-4 w-4 text-indigo-500" />
                                {formatTime(slot.startAt)} – {formatTime(slot.endAt)}
                              </p>
                              {full ? (
                                <span className="shrink-0 text-xs font-bold text-rose-600">
                                  {t("public:entrance.slotFull", "This slot is full")}
                                </span>
                              ) : slot.seatsLeft !== null ? (
                                <span className="shrink-0 text-xs font-bold text-emerald-700">
                                  {t("public:entrance.seatsLeft", "{{count}} seats left", {
                                    count: slot.seatsLeft,
                                  })}
                                </span>
                              ) : null}
                            </div>
                            {slot.location ? (
                              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {slot.location}
                              </p>
                            ) : null}
                            {slot.instructions ? (
                              <p className="text-xs leading-relaxed text-slate-500">{slot.instructions}</p>
                            ) : null}
                            <button
                              type="button"
                              disabled={full || Boolean(busySlotId)}
                              onClick={() => void mutateBooking(data.booking ? "reschedule" : "book", slot.id)}
                              className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busy
                                ? t("public:entrance.saving", "Saving…")
                                : data.booking
                                  ? t("public:entrance.reschedule", "Change to this date")
                                  : t("public:entrance.confirm", "Confirm this date")}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
