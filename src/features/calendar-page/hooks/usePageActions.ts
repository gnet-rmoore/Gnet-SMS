import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { CalendarEvent } from "../types";
import { calendarPageApi } from "../api";
import { confirmAction } from "../../../lib/swal";
import { getCategoryLightBg, getPriorityBadgeClass } from "../eventStyles";

export type PageActionsDeps = {
  user: any;
  fetchedEvents: CalendarEvent[];
  setEvents: (v: CalendarEvent[]) => void;
  events: CalendarEvent[];
  currentDate: Date;
  setCurrentDate: (v: Date) => void;
  setSelectedDate: (v: Date) => void;
  currentYear: number;
  currentMonth: number;
  searchQuery: string;
  selectedCategory: string;
  selectedDate: Date;
  newTitle: string;
  newDesc: string;
  newDateStr: string;
  newTime: string;
  newCategory: CalendarEvent["category"];
  newLocation: string;
  newPriority: CalendarEvent["priority"];
  setNewTitle: (v: string) => void;
  setNewDesc: (v: string) => void;
  setNewTime: (v: string) => void;
  setNewCategory: (v: CalendarEvent["category"]) => void;
  setNewLocation: (v: string) => void;
  setNewPriority: (v: CalendarEvent["priority"]) => void;
  setIsAddingEvent: (v: boolean) => void;
  setSelectedEvent: (v: CalendarEvent | null) => void;
  editingEventId: string | null;
  setEditingEventId: (v: string | null) => void;
  setNewDateStr: (v: string) => void;
  invalidate: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
};

export function usePageActions(deps: PageActionsDeps) {
  const { t } = useTranslation(["pages", "common"]);
  const {
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
  } = deps;

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setEvents(Array.isArray(fetchedEvents) ? fetchedEvents : []);
  }, [fetchedEvents, setEvents]);

  const isEligibleToCreateEvents = useMemo(() => {
    if (!user?.role) return false;
    return !["STUDENT", "PARENT"].includes(user.role);
  }, [user?.role]);

  const daysInMonth = useMemo(
    () => new Date(currentYear, currentMonth + 1, 0).getDate(),
    [currentYear, currentMonth]
  );

  const firstDayOfMonth = useMemo(
    () => new Date(currentYear, currentMonth, 1).getDay(),
    [currentYear, currentMonth]
  );

  const daysOfPrevMonth = useMemo(
    () => new Date(currentYear, currentMonth, 0).getDate(),
    [currentYear, currentMonth]
  );

  const calendarWeeks = useMemo(() => {
    const cells: { date: Date; currentMonth: boolean; key: string }[] = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayVal = daysOfPrevMonth - i;
      cells.push({
        date: new Date(currentYear, currentMonth - 1, dayVal),
        currentMonth: false,
        key: `prev-${dayVal}`,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        date: new Date(currentYear, currentMonth, i),
        currentMonth: true,
        key: `curr-${i}`,
      });
    }

    const totalCells = Math.ceil(cells.length / 7) * 7;
    const nextPadding = totalCells - cells.length;
    for (let i = 1; i <= nextPadding; i++) {
      cells.push({
        date: new Date(currentYear, currentMonth + 1, i),
        currentMonth: false,
        key: `next-${i}`,
      });
    }

    const weeksList = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeksList.push(cells.slice(i, i + 7));
    }
    return weeksList;
  }, [currentYear, currentMonth, daysInMonth, firstDayOfMonth, daysOfPrevMonth]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.location || "").toLowerCase().includes(q);
      const matchesCategory = selectedCategory === "all" || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [events, searchQuery, selectedCategory]);

  const eventsByDateMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  const selectedDateStr = useMemo(
    () => selectedDate.toISOString().split("T")[0],
    [selectedDate]
  );

  const selectedDateEvents = useMemo(
    () => filteredEvents.filter((e) => e.date === selectedDateStr),
    [filteredEvents, selectedDateStr]
  );

  const resetEventForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewTime("09:00 AM - 10:00 AM");
    setNewCategory("Academic");
    setNewLocation("");
    setNewPriority("medium");
    setEditingEventId(null);
  };

  const handleSubmitEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || submitting) return;
    setSubmitting(true);
    const payload = {
      title: newTitle.trim(),
      description: newDesc,
      date: newDateStr,
      time: newTime,
      category: newCategory,
      location: newLocation,
      priority: newPriority,
    };
    try {
      if (editingEventId) {
        await calendarPageApi.updateEvent(editingEventId, payload);
        showToast(t("calendar.toast.eventUpdated"));
      } else {
        await calendarPageApi.createEvent(payload);
        showToast(t("calendar.toast.eventCreated"));
      }
      resetEventForm();
      setIsAddingEvent(false);
      setSelectedEvent(null);
      invalidate();
    } catch (err: any) {
      showToast(
        err?.message ||
          (editingEventId ? t("calendar.toast.failedUpdate") : t("calendar.toast.failedCreate")),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    if (event.isCustom === false || event.id.startsWith("exam-")) {
      showToast(t("calendar.toast.examCannotEdit"), "info");
      return;
    }
    setEditingEventId(event.id);
    setNewTitle(event.title);
    setNewDesc(event.description || "");
    setNewDateStr(event.date);
    setNewTime(event.time || "09:00 AM - 10:00 AM");
    setNewCategory(event.category);
    setNewLocation(event.location || "");
    setNewPriority(event.priority);
    setSelectedEvent(null);
    setIsAddingEvent(true);
  };

  const handleCloseEventForm = () => {
    resetEventForm();
    setIsAddingEvent(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const target = events.find((ev) => ev.id === eventId);
    if (target && target.isCustom === false) {
      showToast(t("calendar.toast.examCannotDelete"), "info");
      return;
    }
    const ok = await confirmAction({
      title: t("calendar.confirm.removeTitle"),
      text: t("calendar.confirm.removeText"),
      confirmText: t("common:remove"),
      danger: true,
    });
    if (!ok) return;
    try {
      await calendarPageApi.deleteEvent(eventId);
      setSelectedEvent(null);
      invalidate();
      showToast(t("calendar.toast.eventRemoved"), "info");
    } catch (err: any) {
      showToast(err?.message || t("calendar.toast.failedRemove"), "error");
    }
  };

  const monthLabel = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return {
    submitting,
    isEligibleToCreateEvents,
    calendarWeeks,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    filteredEvents,
    eventsByDateMap,
    selectedDateStr,
    selectedDateEvents,
    handleSubmitEvent,
    handleEditEvent,
    handleCloseEventForm,
    handleDeleteEvent,
    editingEventId,
    monthLabel,
    getPriorityBadgeClass,
    getCategoryLightBg,
  };
}
