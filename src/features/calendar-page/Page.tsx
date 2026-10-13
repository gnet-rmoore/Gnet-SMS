import React, { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useAuthStore } from "../../store/authStore";
import { useCalendarPageQuery } from "./hooks/useCalendarPageQuery";
import { AddEventModal } from "./components/AddEventModal";
import { EventDetailsModal } from "./components/EventDetailsModal";
import { HeaderAndFilters } from "./components/HeaderAndFilters";
import { CalendarMainGrid } from "./components/CalendarMainGrid";
import type { CalendarEvent } from "./types";
import { usePageActions } from "./hooks/usePageActions";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useTranslation } from "react-i18next";
import { PageShell, PageHeader, Button } from "../../components/ui";
import { Plus } from "lucide-react";

export const CalendarPage = () => {
  const { t } = useTranslation("pages");
  const { user } = useAuthStore();
  const { toast, showToast } = usePageToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const { events: fetchedEvents, invalidate, loading } = useCalendarPageQuery(currentDate);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDateStr, setNewDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("09:00 AM - 10:00 AM");
  const [newCategory, setNewCategory] = useState<CalendarEvent["category"]>("Academic");
  const [newLocation, setNewLocation] = useState("");
  const [newPriority, setNewPriority] = useState<CalendarEvent["priority"]>("medium");

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const categories = [
    "all",
    "Academic",
    "Sports",
    "Administrative",
    "Operations",
    "Health",
    "Finance",
    "Counseling",
    "Holiday",
    "Non-Instruction",
    "Attendance",
    "Class",
    "Other",
  ];

  const {
    submitting,
    isEligibleToCreateEvents,
    calendarWeeks,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    eventsByDateMap,
    selectedDateEvents,
    handleSubmitEvent,
    handleEditEvent,
    handleCloseEventForm,
    handleDeleteEvent,
    editingEventId: activeEditingId,
    monthLabel,
    getPriorityBadgeClass,
    getCategoryLightBg,
  } = usePageActions({
    user,
    fetchedEvents,
    setEvents,
    events,
    currentDate,
    setCurrentDate,
    setSelectedDate,
    currentYear,
    currentMonth,
    searchQuery,
    selectedCategory,
    selectedDate,
    newTitle,
    newDesc,
    newDateStr,
    newTime,
    newCategory,
    newLocation,
    newPriority,
    setNewTitle,
    setNewDesc,
    setNewTime,
    setNewCategory,
    setNewLocation,
    setNewPriority,
    setIsAddingEvent,
    setSelectedEvent,
    editingEventId,
    setEditingEventId,
    setNewDateStr,
    invalidate,
    showToast,
  });

  return (
    <PageShell className="pb-16">
      <PageToast toast={toast} />

      <PageHeader
        title={t("calendar.title")}
        subtitle={t("calendar.subtitle")}
        actions={
          <>
            <Button variant="secondary" type="button" onClick={handleToday}>
              {t("calendar.today", { defaultValue: "Today" })}
            </Button>
            {isEligibleToCreateEvents ? (
              <Button
                type="button"
                onClick={() => {
                  setEditingEventId(null);
                  setNewDateStr(selectedDate.toISOString().split("T")[0]);
                  setIsAddingEvent(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t("calendar.addEvent", { defaultValue: "Add event" })}
              </Button>
            ) : null}
          </>
        }
      />

      <HeaderAndFilters
        categories={categories}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        setSearchQuery={setSearchQuery}
        setSelectedCategory={setSelectedCategory}
      />

      {loading ? (
        <div className="h-96 rounded-[32px] bg-slate-100 animate-pulse" />
      ) : (
        <CalendarMainGrid
          calendarWeeks={calendarWeeks}
          eventsByDateMap={eventsByDateMap}
          handleNextMonth={handleNextMonth}
          handlePrevMonth={handlePrevMonth}
          monthLabel={monthLabel}
          selectedDate={selectedDate}
          selectedDateEvents={selectedDateEvents}
          setSelectedDate={setSelectedDate}
          setSelectedEvent={setSelectedEvent}
          isEligibleToCreateEvents={isEligibleToCreateEvents}
          onAddForSelected={() => {
            setEditingEventId(null);
            setNewDateStr(selectedDate.toISOString().split("T")[0]);
            setIsAddingEvent(true);
          }}
        />
      )}

      <AnimatePresence>
        {selectedEvent && (
          <EventDetailsModal
            getCategoryLightBg={getCategoryLightBg}
            getPriorityBadgeClass={getPriorityBadgeClass}
            handleDeleteEvent={handleDeleteEvent}
            onEditEvent={isEligibleToCreateEvents ? handleEditEvent : undefined}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingEvent && (
          <AddEventModal
            handleSubmitEvent={handleSubmitEvent}
            mode={activeEditingId ? "edit" : "create"}
            newCategory={newCategory}
            newDateStr={newDateStr}
            newDesc={newDesc}
            newLocation={newLocation}
            newPriority={newPriority}
            newTime={newTime}
            newTitle={newTitle}
            onClose={handleCloseEventForm}
            setNewCategory={setNewCategory}
            setNewDateStr={setNewDateStr}
            setNewDesc={setNewDesc}
            setNewLocation={setNewLocation}
            setNewPriority={setNewPriority}
            setNewTime={setNewTime}
            setNewTitle={setNewTitle}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
};
