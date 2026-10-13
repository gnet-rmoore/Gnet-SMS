import type { FormEvent } from "react";
import type { CalendarEvent } from "../types";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { FriendlyDateField } from "../../academic-calendar/components/FriendlyDateField";

export type AddEventModalProps = {
  handleSubmitEvent: (e: FormEvent) => void;
  mode?: "create" | "edit";
  newCategory: CalendarEvent["category"];
  newDateStr: string;
  newDesc: string;
  newLocation: string;
  newPriority: CalendarEvent["priority"];
  newTime: string;
  newTitle: string;
  onClose: () => void;
  setNewCategory: (v: CalendarEvent["category"]) => void;
  setNewDateStr: (v: string) => void;
  setNewDesc: (v: string) => void;
  setNewLocation: (v: string) => void;
  setNewPriority: (v: CalendarEvent["priority"]) => void;
  setNewTime: (v: string) => void;
  setNewTitle: (v: string) => void;
  submitting?: boolean;
};

export function AddEventModal({
  handleSubmitEvent,
  mode = "create",
  newCategory,
  newDateStr,
  newDesc,
  newLocation,
  newPriority,
  newTime,
  newTitle,
  onClose,
  setNewCategory,
  setNewDateStr,
  setNewDesc,
  setNewLocation,
  setNewPriority,
  setNewTime,
  setNewTitle,
  submitting,
}: AddEventModalProps) {
  const isEdit = mode === "edit";
  return (
    <FeatureModalShell
      eyebrow="School calendar"
      title={isEdit ? "Edit event" : "Add event"}
      subtitle={
        isEdit
          ? "Update this school calendar event."
          : "Create a school event visible on the calendar."
      }
      onClose={onClose}
    >
      <form id="add-calendar-event-form" onSubmit={handleSubmitEvent} className="p-8 space-y-5">
        <div className="space-y-1.5">
          <label className={fieldLabel}>
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Faculty meeting"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className={fieldInput}
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>Description</label>
          <textarea
            placeholder="Optional notes"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={3}
            className={`${fieldInput} resize-none font-medium`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FriendlyDateField
            label="Date"
            value={newDateStr}
            onChange={setNewDateStr}
            required
          />
          <div className="space-y-1.5">
            <label className={fieldLabel}>Time</label>
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="e.g. 09:00 AM - 10:00 AM"
              className={fieldInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel}>Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as CalendarEvent["category"])}
              className={fieldInput}
            >
              <option value="Academic">Academic</option>
            <option value="Sports">Sports</option>
            <option value="Administrative">Administrative</option>
            <option value="Operations">Operations</option>
            <option value="Health">Health</option>
            <option value="Finance">Finance</option>
            <option value="Counseling">Counseling</option>
            <option value="Holiday">Holiday (non-instruction)</option>
            <option value="Non-Instruction">Non-instruction day</option>
            <option value="Attendance">Attendance</option>
            <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabel}>Priority</label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as CalendarEvent["priority"])}
              className={fieldInput}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>Location</label>
          <input
            type="text"
            placeholder="e.g. Main hall"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            className={fieldInput}
          />
        </div>
      </form>
      <div className="px-8 pb-8 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="add-calendar-event-form"
          disabled={submitting}
          className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Save event"}
        </button>
      </div>
    </FeatureModalShell>
  );
}
