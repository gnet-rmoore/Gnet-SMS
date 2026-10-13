import React from "react";
import { Mail, Save, Send } from "lucide-react";
import { Button, SelectField, TextField } from "../../../components/ui";
import { toast } from "../../../lib/swal";
import { useTranslation } from "react-i18next";

type EmailProvider =
  | "console"
  | "smtp"
  | "sendgrid"
  | "ses"
  | "mailgun"
  | "resend";

type EmailSettingsResponse = {
  emailProvider: EmailProvider;
  emailFrom: string;
  requireEmailVerification: boolean;
  configured: boolean;
  source: "database" | "environment";
  secrets: Record<string, string | null>;
};

const PROVIDERS: { id: EmailProvider; labelKey: string }[] = [
  { id: "console", labelKey: "emailProviderConsole" },
  { id: "sendgrid", labelKey: "emailProviderSendgrid" },
  { id: "resend", labelKey: "emailProviderResend" },
  { id: "mailgun", labelKey: "emailProviderMailgun" },
  { id: "ses", labelKey: "emailProviderSes" },
  { id: "smtp", labelKey: "emailProviderSmtp" },
];

type Props = {
  accessToken: string | null;
};

export function EmailSettingsPanel({ accessToken }: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const s = (key: string) => t(`pages:superAdmin.settingsUi.${key}`);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [meta, setMeta] = React.useState<Pick<EmailSettingsResponse, "configured" | "source">>({
    configured: false,
    source: "environment",
  });
  const [emailProvider, setEmailProvider] = React.useState<EmailProvider>("console");
  const [emailFrom, setEmailFrom] = React.useState("");
  const [requireEmailVerification, setRequireEmailVerification] = React.useState(false);
  const [testTo, setTestTo] = React.useState("");
  const [secrets, setSecrets] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/email-settings", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json()) as EmailSettingsResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load email settings");
      setEmailProvider(data.emailProvider || "console");
      setEmailFrom(data.emailFrom || "");
      setRequireEmailVerification(Boolean(data.requireEmailVerification));
      setMeta({ configured: data.configured, source: data.source });
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.secrets || {})) {
        if (v) next[k] = v;
      }
      setSecrets(next);
    } catch (err: any) {
      await toast.fire({ icon: "error", title: err.message || "Failed to load email settings" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const setSecret = (key: string, value: string) => {
    setSecrets((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/email-settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailProvider,
          emailFrom,
          requireEmailVerification,
          secrets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMeta({ configured: data.configured, source: data.source });
      await toast.fire({ icon: "success", title: s("emailSettingsSaved") });
      void load();
    } catch (err: any) {
      await toast.fire({ icon: "error", title: err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!accessToken || !testTo.trim()) return;
    setTesting(true);
    try {
      const res = await fetch("/api/super-admin/email-settings/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Test send failed");
      }
      await toast.fire({
        icon: "success",
        title: s("emailTestSent"),
        text: `${s("emailTestProvider")}: ${data.provider}`,
      });
    } catch (err: any) {
      await toast.fire({ icon: "error", title: err.message || "Test send failed" });
    } finally {
      setTesting(false);
    }
  };

  const secretField = (key: string, label: string, type: "text" | "password" = "password") => (
    <TextField
      label={label}
      type={type}
      value={secrets[key] || ""}
      onChange={(e) => setSecret(key, e.target.value)}
      placeholder={secrets[key]?.includes("*") ? secrets[key] : s("emailSecretPlaceholder")}
      className="font-mono text-sm"
    />
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
        {t("common:loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              {s("transactionalEmail")}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{s("transactionalEmailHint")}</p>
            <p className="text-xs text-slate-400 mt-2">
              {meta.source === "database" ? s("emailSourceDatabase") : s("emailSourceEnvironment")}
              {meta.configured ? ` · ${s("emailConfigured")}` : ` · ${s("emailNotConfigured")}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectField
          label={s("emailProvider")}
          value={emailProvider}
          onChange={(e) => setEmailProvider(e.target.value as EmailProvider)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {s(p.labelKey)}
            </option>
          ))}
        </SelectField>
        <TextField
          label={s("emailFromAddress")}
          type="email"
          value={emailFrom}
          onChange={(e) => setEmailFrom(e.target.value)}
          placeholder="noreply@yourdomain.com"
        />
      </div>

      {emailProvider === "sendgrid" && secretField("sendgridApiKey", s("sendgridApiKey"))}
      {emailProvider === "resend" && secretField("resendApiKey", s("resendApiKey"))}
      {emailProvider === "mailgun" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {secretField("mailgunApiKey", s("mailgunApiKey"))}
          {secretField("mailgunDomain", s("mailgunDomain"), "text")}
          <SelectField
            label={s("mailgunRegion")}
            value={secrets.mailgunRegion || "us"}
            onChange={(e) => setSecret("mailgunRegion", e.target.value)}
          >
            <option value="us">US</option>
            <option value="eu">EU</option>
          </SelectField>
        </div>
      )}
      {emailProvider === "ses" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {secretField("awsAccessKeyId", s("awsAccessKeyId"), "text")}
          {secretField("awsSecretAccessKey", s("awsSecretAccessKey"))}
          {secretField("awsRegion", s("awsRegion"), "text")}
        </div>
      )}
      {emailProvider === "smtp" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {secretField("smtpHost", s("smtpHost"), "text")}
          {secretField("smtpPort", s("smtpPort"), "text")}
          {secretField("smtpUser", s("smtpUser"), "text")}
          {secretField("smtpPass", s("smtpPass"))}
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={secrets.smtpSecure === "true"}
              onChange={(e) => setSecret("smtpSecure", e.target.checked ? "true" : "false")}
              className="rounded border-slate-300 text-indigo-600"
            />
            {s("smtpSecure")}
          </label>
        </div>
      )}

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={requireEmailVerification}
          onChange={(e) => setRequireEmailVerification(e.target.checked)}
          className="rounded border-slate-300 text-indigo-600"
        />
        {s("requireEmailVerification")}
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={handleSave} loading={saving}>
          {!saving && <Save className="w-5 h-5" />}
          {saving ? t("common:loading") : s("saveEmailSettings")}
        </Button>
      </div>

      <div className="border-t border-slate-100 pt-6 space-y-4">
        <h4 className="font-bold text-slate-900">{s("emailTestTitle")}</h4>
        <p className="text-sm text-slate-500">{s("emailTestHint")}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder={s("emailTestRecipient")}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <Button variant="secondary" onClick={handleTest} loading={testing} disabled={!testTo.trim()}>
            {!testing && <Send className="w-4 h-4" />}
            {s("sendTestEmail")}
          </Button>
        </div>
      </div>
    </div>
  );
}
