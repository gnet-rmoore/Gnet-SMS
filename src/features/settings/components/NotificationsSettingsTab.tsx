import React from "react";
import { motion } from "motion/react";
import { Bell, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import { confirmAction } from "../../../lib/swal";
import { DataTable, dataTableClass } from "../../../components/ui";
import {
  NOTIFICATION_EVENT_META,
  isSystemNotificationKey,
  normalizeCustomEventKey,
  type NotificationEventKey,
  type NotificationPrefRow,
} from "../../../lib/notificationPrefs";

type Props = {
  prefs: NotificationPrefRow[];
  setPrefs: (p: NotificationPrefRow[]) => void;
  saving: boolean;
  onSave: () => void;
  pendingRemovals: string[];
  setPendingRemovals: (keys: string[]) => void;
};

export function NotificationsSettingsTab({
  prefs,
  setPrefs,
  saving,
  onSave,
  pendingRemovals,
  setPendingRemovals,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const n = (key: string, opts?: Record<string, unknown>) =>
    t(`settings.notificationsTab.${key}`, opts);

  const [addOpen, setAddOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newKey, setNewKey] = React.useState("");
  const [keyTouched, setKeyTouched] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const patch = (eventKey: string, partial: Partial<NotificationPrefRow>) => {
    setPrefs(prefs.map((p) => (p.eventKey === eventKey ? { ...p, ...partial } : p)));
  };

  const openAdd = () => {
    setNewLabel("");
    setNewDescription("");
    setNewKey("");
    setKeyTouched(false);
    setFormError("");
    setAddOpen(true);
  };

  const onLabelChange = (value: string) => {
    setNewLabel(value);
    if (!keyTouched) {
      setNewKey(normalizeCustomEventKey(value) || "");
    }
  };

  const submitAdd = () => {
    setFormError("");
    const label = newLabel.trim();
    if (!label) {
      setFormError(n("errorNameRequired"));
      return;
    }
    const eventKey = normalizeCustomEventKey(newKey || label);
    if (!eventKey) {
      setFormError(n("errorKeyFormat"));
      return;
    }
    if (isSystemNotificationKey(eventKey)) {
      setFormError(n("errorKeyReserved"));
      return;
    }
    if (prefs.some((p) => p.eventKey === eventKey)) {
      setFormError(n("errorKeyExists"));
      return;
    }
    setPrefs([
      ...prefs,
      {
        eventKey,
        label,
        description: newDescription.trim(),
        emailEnabled: true,
        inAppEnabled: true,
        isCustom: true,
      },
    ]);
    setPendingRemovals(pendingRemovals.filter((k) => k !== eventKey));
    setAddOpen(false);
  };

  const removeCustom = async (row: NotificationPrefRow) => {
    if (!row.isCustom && isSystemNotificationKey(String(row.eventKey))) return;
    const ok = await confirmAction({
      title: n("removeTitle"),
      text: n("removeText", { label: row.label || row.eventKey }),
      confirmText: n("removeConfirm"),
      danger: true,
    });
    if (!ok) return;
    setPrefs(prefs.filter((p) => p.eventKey !== row.eventKey));
    if (!pendingRemovals.includes(String(row.eventKey))) {
      setPendingRemovals([...pendingRemovals, String(row.eventKey)]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            {n("title")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{n("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shrink-0"
        >
          <Plus className="w-4 h-4" />
          {n("addCategory")}
        </button>
      </div>

      <DataTable className="rounded-2xl border border-slate-100">
        <table className={dataTableClass.table}>
          <thead className={dataTableClass.thead}>
            <tr>
              <th className={dataTableClass.th}>{n("tableCategory")}</th>
              <th className={`${dataTableClass.th} text-center w-28`}>{n("tableEmail")}</th>
              <th className={`${dataTableClass.th} text-center w-28`}>{n("tableInApp")}</th>
              <th className={`${dataTableClass.th} w-16`} />
            </tr>
          </thead>
          <tbody className={dataTableClass.tbody}>
            {prefs.map((row) => {
              const meta =
                NOTIFICATION_EVENT_META[row.eventKey as NotificationEventKey];
              const isCustom =
                Boolean(row.isCustom) || !isSystemNotificationKey(String(row.eventKey));
              return (
                <tr key={row.eventKey} className="bg-white">
                  <td className={dataTableClass.td}>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {meta?.label || row.label || row.eventKey}
                      </p>
                      {isCustom && (
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                          {n("customBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {meta?.description || row.description || ""}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-1 truncate">{row.eventKey}</p>
                  </td>
                  <td className={`${dataTableClass.td} text-center`}>
                    <input
                      type="checkbox"
                      checked={row.emailEnabled}
                      onChange={(e) =>
                        patch(row.eventKey, { emailEnabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className={`${dataTableClass.td} text-center`}>
                    <input
                      type="checkbox"
                      checked={row.inAppEnabled}
                      onChange={(e) =>
                        patch(row.eventKey, { inAppEnabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className={`${dataTableClass.td} text-end`}>
                    {isCustom ? (
                      <button
                        type="button"
                        onClick={() => removeCustom(row)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        aria-label={n("removeAria", { label: row.label || row.eventKey })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataTable>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? n("saving") : n("savePrefs")}
        </button>
      </div>

      {addOpen && (
        <FeatureModalShell
          title={n("addModalTitle")}
          subtitle={n("addModalSubtitle")}
          onClose={() => setAddOpen(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                onClick={submitAdd}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
              >
                {n("addCategory")}
              </button>
            </div>
          }
        >
          <div className="p-6 sm:p-8 space-y-4">
            <div>
              <label className={fieldLabel}>{n("nameLabel")}</label>
              <input
                className={`${fieldInput} mt-1.5`}
                value={newLabel}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder={n("namePlaceholder")}
                autoFocus
              />
            </div>
            <div>
              <label className={fieldLabel}>{n("descriptionLabel")}</label>
              <input
                className={`${fieldInput} mt-1.5`}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={n("descriptionPlaceholder")}
              />
            </div>
            <div>
              <label className={fieldLabel}>{n("eventKeyLabel")}</label>
              <input
                className={`${fieldInput} mt-1.5 font-mono text-sm`}
                value={newKey}
                onChange={(e) => {
                  setKeyTouched(true);
                  setNewKey(e.target.value.toUpperCase());
                }}
                placeholder={n("eventKeyPlaceholder")}
              />
              <p className="text-xs text-slate-500 mt-1.5">{n("eventKeyHint")}</p>
            </div>
            {formError ? <p className="text-sm text-rose-600 font-medium">{formError}</p> : null}
          </div>
        </FeatureModalShell>
      )}
    </motion.div>
  );
}
