import React from "react";
import {
  Calendar,
  ClipboardList,
  Search,
  Filter,
  User
} from "lucide-react";
import { formatSafe } from "../utils/dateHelpers";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export type TasksTabProps = {
  colTasks?: any;
  filteredTasks?: any;
  handleUpdateTask?: any;
  setTaskPriorityFilter?: any;
  setTaskSearch?: any;
  taskPriorityFilter?: any;
  taskSearch?: any;
  [key: string]: any;
};

const PRIORITY_KEYS: Record<string, string> = {
  ALL: "all",
  URGENT: "urgent",
  HIGH: "high",
  NORMAL: "normal",
};

const COLUMN_KEYS: Record<string, string> = {
  TODO: "colTodo",
  IN_PROGRESS: "colInProgress",
  COMPLETED: "colCompleted",
};

/** Presentational extract from Page.tsx lines 534-647. */
export function TasksTab({
  filteredTasks,
  handleUpdateTask,
  setTaskPriorityFilter,
  setTaskSearch,
  taskPriorityFilter,
  taskSearch,
}: TasksTabProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
                  <motion.div
                    key="tasks"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Filters and search bar */}
                    <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder={t("staffPortal.tasks.searchPlaceholder")}
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">{t("staffPortal.tasks.priority")}:</span>
                        {["ALL", "URGENT", "HIGH", "NORMAL"].map((priority) => (
                          <button
                            key={priority}
                            onClick={() => setTaskPriorityFilter(priority)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                              taskPriorityFilter === priority 
                                ? "bg-slate-900 text-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]" 
                                : "text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-100"
                            }`}
                          >
                            {t(`staffPortal.tasks.${PRIORITY_KEYS[priority]}`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Task Columns based on status */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {[
                        { id: "TODO", color: "bg-slate-200 text-slate-800", indicator: "bg-slate-400" },
                        { id: "IN_PROGRESS", color: "bg-amber-100 text-amber-800", indicator: "bg-amber-500" },
                        { id: "COMPLETED", color: "bg-emerald-100 text-emerald-800", indicator: "bg-emerald-500" }
                      ].map((col) => {
                        const colTasks = filteredTasks.filter((taskItem: { status: string }) => taskItem.status === col.id);
                        return (
                          <div key={col.id} className="bg-slate-50/50 border border-slate-100 rounded-[32px] p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${col.indicator}`} />
                                <h3 className="font-bold text-slate-800 text-sm">{t(`staffPortal.tasks.${COLUMN_KEYS[col.id]}`)}</h3>
                              </div>
                              <span className="text-xs font-bold bg-white text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100">
                                {colTasks.length}
                              </span>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                              {colTasks.map((task: {
                                id: string;
                                priority: string;
                                status: string;
                                title: string;
                                description?: string;
                                dueDate?: string;
                                creator?: { name?: string };
                              }) => (
                                <div key={task.id} className="bg-white rounded-2xl p-5 border border-slate-100/80 hover:border-slate-200 hover:shadow-md hover:shadow-slate-100/50 transition-all space-y-4">
                                  <div className="flex justify-between items-start gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${
                                      task.priority === "URGENT" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                      task.priority === "HIGH" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                      "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                    }`}>
                                      {t(`staffPortal.tasks.${PRIORITY_KEYS[task.priority] || "normal"}`)}
                                    </span>

                                    <select
                                      value={task.status}
                                      onChange={(e) => handleUpdateTask(task.id, e.target.value)}
                                      className="text-xs font-bold uppercase bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg focus:ring-1 focus:ring-indigo-500 cursor-pointer p-1 py-0.5"
                                    >
                                      <option value="TODO">{t("staffPortal.tasks.statusTodo")}</option>
                                      <option value="IN_PROGRESS">{t("staffPortal.tasks.statusProgress")}</option>
                                      <option value="COMPLETED">{t("staffPortal.tasks.statusCompleted")}</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{task.title}</h4>
                                    <p className="text-xs text-slate-500 leading-normal font-medium">{task.description}</p>
                                  </div>

                                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      {t("staffPortal.tasks.due")}{" "}
                                      {task.dueDate ? formatSafe(task.dueDate, "MMM dd, yyyy") : t("staffPortal.tasks.noLimit")}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      {t("staffPortal.tasks.from")}{" "}
                                      {task.creator?.name ? task.creator.name.split(" ")[0] : t("staffPortal.tasks.admin")}
                                    </span>
                                  </div>
                                </div>
                              ))}

                              {colTasks.length === 0 && (
                                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                                  <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-1.5" />
                                  <p className="text-xs font-bold text-slate-500">{t("staffPortal.tasks.columnEmpty")}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
  );
}
