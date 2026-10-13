import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, Key, Plus, Trash2, Copy, Check, RefreshCw, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { confirmAction } from "../../../lib/swal";
import { saveSchoolApiKeyForSession } from "../../../lib/schoolApiKeySession";
import { settingsApi, type SchoolApiKeyRow } from "../api";
import { fieldInput, fieldLabel } from "../../academics-shared/FeatureModalShell";

type Props = {
  schoolId: string;
  enabled: boolean;
  showToast: (message: string, tone?: "success" | "error" | "info") => void;
};

export function ApiKeysSettingsCard({ schoolId, enabled, showToast }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const { slug } = useParams();

  const [keys, setKeys] = React.useState<SchoolApiKeyRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [freshSecret, setFreshSecret] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [showDocs, setShowDocs] = React.useState(true);

  const loadKeys = React.useCallback(async () => {
    if (!schoolId || !enabled) {
      setLoading(false);
      setKeys([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await settingsApi.listApiKeys(schoolId);
      setKeys(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      showToast(err?.message || t("settings.apiKeysTab.loadFailed"), "error");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, enabled, showToast, t]);

  React.useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      showToast(t("settings.apiKeysTab.nameRequired"), "error");
      return;
    }
    setCreating(true);
    try {
      const row = await settingsApi.createApiKey(schoolId, name);
      if (row.secret) {
        saveSchoolApiKeyForSession(schoolId, {
          secret: row.secret,
          keyPrefix: row.keyPrefix,
          name: row.name,
        });
      }
      setFreshSecret(row.secret || null);
      setNewName("");
      await loadKeys();
      showToast(t("settings.apiKeysTab.created"), "success");
    } catch (err: any) {
      showToast(err?.message || t("settings.apiKeysTab.createFailed"), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (key: SchoolApiKeyRow) => {
    const ok = await confirmAction({
      title: t("settings.apiKeysTab.revokeTitle"),
      text: t("settings.apiKeysTab.revokeText", { name: key.name }),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await settingsApi.revokeApiKey(schoolId, key.id);
      if (freshSecret) setFreshSecret(null);
      await loadKeys();
      showToast(t("settings.apiKeysTab.revoked"), "info");
    } catch (err: any) {
      showToast(err?.message || t("settings.apiKeysTab.revokeFailed"), "error");
    }
  };

  const handleCopy = async () => {
    if (!freshSecret) return;
    try {
      await navigator.clipboard.writeText(freshSecret);
      setCopied(true);
      showToast(t("settings.apiKeysTab.copied"), "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(t("settings.apiKeysTab.copyFailed"), "error");
    }
  };

  if (!enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            {t("settings.apiKeysTab.title")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t("settings.apiKeysTab.subtitle")}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-500">
          {t("settings.apiKeysTab.upgradeHint")}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Key className="w-5 h-5 text-indigo-600" />
          {t("settings.apiKeysTab.title")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t("settings.apiKeysTab.subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDocs((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            {t("settings.apiKeysTab.docsTitle")}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {showDocs ? t("settings.apiKeysTab.docsHide") : t("settings.apiKeysTab.docsShow")}
          </span>
        </button>
        {showDocs ? (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed pt-4">
              {t("settings.apiKeysTab.docsIntro")}
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="font-mono text-xs text-slate-400 shrink-0 pt-0.5">{n}.</span>
                  <span>{t(`settings.apiKeysTab.docsStep${n}`)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">{t("settings.apiKeysTab.docsFootnote")}</p>
          </div>
        ) : null}
      </div>

      {freshSecret && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-900">{t("settings.apiKeysTab.secretOnce")}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 rounded-xl bg-white border border-amber-100 px-3 py-2 text-xs font-mono text-slate-800 break-all">
              {freshSecret}
            </code>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t("settings.apiKeysTab.copied") : t("settings.apiKeysTab.copy")}
            </button>
          </div>
          {slug ? (
            <Link
              to={`/${slug}/api-docs`}
              className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-800"
            >
              <Terminal className="w-4 h-4" />
              {t("settings.apiKeysTab.tryInDocs")}
            </Link>
          ) : null}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <label className={fieldLabel} htmlFor="api-key-name">
            {t("settings.apiKeysTab.nameLabel")}
          </label>
          <input
            id="api-key-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("settings.apiKeysTab.namePlaceholder")}
            className={fieldInput}
          />
        </div>
        <button
          type="button"
          disabled={creating}
          onClick={() => void handleCreate()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 shrink-0"
        >
          {creating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {creating ? t("settings.apiKeysTab.creating") : t("settings.apiKeysTab.create")}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">{t("settings.apiKeysTab.loading")}</div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{t("settings.apiKeysTab.empty")}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{key.name}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {key.keyPrefix}…
                    {key.lastUsedAt
                      ? ` · ${t("settings.apiKeysTab.lastUsed")} ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : ` · ${t("settings.apiKeysTab.neverUsed")}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevoke(key)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("settings.apiKeysTab.revoke")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500">{t("settings.apiKeysTab.usageHint")}</p>
    </motion.div>
  );
};
