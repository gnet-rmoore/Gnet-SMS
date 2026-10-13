import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Trash2, ArrowRight, Pencil, Clock } from "lucide-react";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import type { CalendarEvent } from "../types";
import { getCategoryAgendaCardClass, getCategoryBadgeClass, getPriorityBadgeClass } from "../eventStyles";

export type EventDetailsModalProps = {
  getCategoryLightBg: (c: CalendarEvent["category"]) => string;
  getPriorityBadgeClass: (p: CalendarEvent["priority"]) => string;
  handleDeleteEvent: (id: string) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  selectedEvent: CalendarEvent;
  setSelectedEvent: (v: CalendarEvent | null) => void;
};

export function EventDetailsModal({
  handleDeleteEvent,
  onEditEvent,
  selectedEvent,
  setSelectedEvent,
}: EventDetailsModalProps) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const canManage = selectedEvent.isCustom === true;

  return (
    <FeatureModalShell
      eyebrow={selectedEvent.category}
      title={selectedEvent.title}
      subtitle={selectedEvent.description || undefined}
      onClose={() => setSelectedEvent(null)}
    >
      <div className="space-y-4 p-8">
        <div className={`rounded-2xl border border-slate-100 p-4 ${getCategoryAgendaCardClass(selectedEvent.category)}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClass(selectedEvent.category)}`}
            >
              {selectedEvent.category}
            </span>
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${getPriorityBadgeClass(selectedEvent.priority)}`}
            >
              {selectedEvent.priority} priority
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</p>
            <p className="mt-1 text-sm font-bold text-slate-800">
              {new Date(selectedEvent.date + "T12:00:00").toLocaleDateString(undefined, {
                dateStyle: "long",
              })}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Time</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {selectedEvent.time}
            </p>
          </div>
        </div>

        {selectedEvent.location && (
          <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{selectedEvent.location}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-8 pb-8">
        <div className="flex items-center gap-1">
          {canManage && onEditEvent && (
            <button
              type="button"
              onClick={() => onEditEvent(selectedEvent)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => handleDeleteEvent(selectedEvent.id)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedEvent(null)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          {selectedEvent.actionPath && (
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                navigate(`/${slug}/${selectedEvent.actionPath}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
            >
              {selectedEvent.actionLabel || "Open"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </FeatureModalShell>
  );
}
