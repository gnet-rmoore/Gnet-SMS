import React from "react";
import { motion } from "motion/react";
import { 
  Settings as SettingsIcon, 
  Shield, 
  Database, 
  Bell, 
  Globe, 
  Mail, 
  Lock,
  Save,
  AlertCircle
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { CountryTimezoneFields } from "../../components/CountryTimezoneFields";
import { DEFAULT_COUNTRY, DEFAULT_TIMEZONE } from "../../lib/countryTimezones";
import { confirmAction, toast } from "../../lib/swal";
import { PageShell, PageHeader, Surface, Button } from "../../components/ui";
import { EmailSettingsPanel } from "./components/EmailSettingsPanel";
import { useTranslation } from "react-i18next";

export const Settings = () => {
  const { t } = useTranslation(["pages", "common"]);
  const s = (key: string) => t(`superAdmin.settingsUi.${key}`);
  const [activeTab, setActiveTab] = React.useState("GENERAL");
  const [saving, setSaving] = React.useState(false);
  const [defaultCountry, setDefaultCountry] = React.useState(DEFAULT_COUNTRY);
  const [defaultTimezone, setDefaultTimezone] = React.useState(DEFAULT_TIMEZONE);

  const tabs = [
    { id: "GENERAL", label: s("tabGeneral"), icon: <SettingsIcon className="w-5 h-5" /> },
    { id: "PLATFORM", label: "Platform ops", icon: <Globe className="w-5 h-5" /> },
    { id: "SECURITY", label: s("tabSecurity"), icon: <Shield className="w-5 h-5" /> },
    { id: "DATABASE", label: s("tabDatabase"), icon: <Database className="w-5 h-5" /> },
    { id: "CREDENTIALS", label: s("tabCredentials"), icon: <Shield className="w-5 h-5" /> },
    { id: "NOTIFICATIONS", label: s("tabNotifications"), icon: <Bell className="w-5 h-5" /> },
  ];

  const [credentials, setCredentials] = React.useState<any[]>([]);
  const [newCred, setNewCred] = React.useState({ name: "", provider: "CUSTOM", key: "", secret: "" });
  const [isAddingCred, setIsAddingCred] = React.useState(false);
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = React.useState("");
  const [defaultSecurityPolicy, setDefaultSecurityPolicy] = React.useState({
    passwordMinLength: 6,
    requireStrongPassword: false,
    sessionIdleMinutes: 0,
    forcePasswordChangeDays: 0,
    mfaMode: "OFF" as const,
    mfaRequiredRoles: [] as string[],
    allowSmsMfa: false,
  });
  const [jwtAccessTtl, setJwtAccessTtl] = React.useState("8h");
  const [requireOperatorMfa, setRequireOperatorMfa] = React.useState(false);
  const [securitySaving, setSecuritySaving] = React.useState(false);
  const [broadcastSubject, setBroadcastSubject] = React.useState("");
  const [broadcastMessage, setBroadcastMessage] = React.useState("");
  const [deliveryItems, setDeliveryItems] = React.useState<any[]>([]);
  const { accessToken } = useAuthStore();

  const fetchCredentials = async () => {
    try {
      const response = await fetch("/api/super-admin/credentials", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setCredentials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch credentials:", err);
      setCredentials([]);
    }
  };

  React.useEffect(() => {
    if (activeTab === "CREDENTIALS") {
      fetchCredentials();
    }
    if (activeTab === "PLATFORM" && accessToken) {
      void fetch("/api/super-admin/platform-settings", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) {
            setMaintenanceMode(Boolean(d.maintenanceMode));
            setMaintenanceMessage(d.maintenanceMessage || "");
          }
        });
      void fetch("/api/super-admin/delivery-diagnostics", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => r.json())
        .then((d) => setDeliveryItems(Array.isArray(d?.items) ? d.items : []));
    }
    if (activeTab === "SECURITY" && accessToken) {
      void fetch("/api/super-admin/platform-settings", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) {
            if (d.defaultSecurityPolicy) setDefaultSecurityPolicy(d.defaultSecurityPolicy);
            if (d.jwtAccessTtl) setJwtAccessTtl(String(d.jwtAccessTtl));
            setRequireOperatorMfa(Boolean(d.requireOperatorMfa));
          }
        });
    }
  }, [activeTab, accessToken]);

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/super-admin/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(newCred),
      });
      if (response.ok) {
        setIsAddingCred(false);
        setNewCred({ name: "", provider: "CUSTOM", key: "", secret: "" });
        fetchCredentials();
      }
    } catch (err) {
      console.error("Failed to add credential:", err);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    const ok = await confirmAction({
      title: s("deleteCredentialTitle"),
      text: s("deleteCredentialText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/super-admin/credentials/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        fetchCredentials();
      }
    } catch (err) {
      console.error("Failed to delete credential:", err);
    }
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <PageShell>
      <PageHeader
        title={t("pages:superAdmin.settings")}
        subtitle={t("pages:superAdmin.settingsSubtitle")}
        actions={
          <Button onClick={handleSave} loading={saving}>
            {!saving && <Save className="w-5 h-5" />}
            {saving ? t("common:loading") : t("common:saveChanges")}
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-64 shrink-0 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <Surface variant="primary" className="flex-1 space-y-8">
          {activeTab === "PLATFORM" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h3 className="font-extrabold tracking-tight text-slate-900">Maintenance mode</h3>
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Block school-user logins (Super Admin can still sign in)
                </label>
                <input
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Optional message shown to school users"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <Button
                  onClick={async () => {
                    const res = await fetch("/api/super-admin/platform-settings", {
                      method: "PATCH",
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ maintenanceMode, maintenanceMessage }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      await toast.fire({ icon: "error", title: data.error || "Save failed" });
                      return;
                    }
                    await toast.fire({ icon: "success", title: "Platform settings saved" });
                  }}
                >
                  Save platform settings
                </Button>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-8">
                <h3 className="font-extrabold tracking-tight text-slate-900">Broadcast to school admins</h3>
                <input
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  placeholder="Message"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const res = await fetch("/api/super-admin/broadcast", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        subject: broadcastSubject,
                        message: broadcastMessage,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      await toast.fire({ icon: "error", title: data.error || "Broadcast failed" });
                      return;
                    }
                    await toast.fire({
                      icon: "success",
                      title: `Sent ${data.sent ?? 0} / failed ${data.failed ?? 0} (of ${data.queued ?? 0})`,
                    });
                    const diag = await fetch("/api/super-admin/delivery-diagnostics", {
                      headers: { Authorization: `Bearer ${accessToken}` },
                    }).then((r) => r.json());
                    setDeliveryItems(Array.isArray(diag?.items) ? diag.items : []);
                  }}
                >
                  <Mail className="w-4 h-4" />
                  Send broadcast
                </Button>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-8">
                <h3 className="font-extrabold tracking-tight text-slate-900">Delivery diagnostics</h3>
                <p className="text-sm text-slate-500">
                  MailDeliveryLog for broadcasts plus invite/mail system logs.
                </p>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {deliveryItems.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No delivery logs found.</p>
                  ) : (
                    deliveryItems.slice(0, 20).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs"
                      >
                        <p className="font-bold text-slate-800">
                          {item.action} · {item.module}
                          {typeof item.ok === "boolean" ? (item.ok ? " · ok" : " · failed") : ""}
                        </p>
                        <p className="text-slate-500 mt-1">{item.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "GENERAL" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{s("systemName")}</label>
                  <input 
                    type="text" 
                    defaultValue="School Management System"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{s("supportEmail")}</label>
                  <input 
                    type="email" 
                    defaultValue="support@example.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  {s("regionalSettings")}
                </h3>
                <CountryTimezoneFields
                  country={defaultCountry}
                  timezone={defaultTimezone}
                  onCountryChange={setDefaultCountry}
                  onTimezoneChange={setDefaultTimezone}
                  countryLabel={s("defaultCountry")}
                  timezoneLabel={s("defaultTimezone")}
                />
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-bold text-slate-700 ml-1">{s("defaultCurrency")}</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option>USD ($)</option>
                    <option>GBP (£)</option>
                    <option>EUR (€)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "SECURITY" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h3 className="font-extrabold tracking-tight text-slate-900">Default school security template</h3>
                <p className="text-sm text-slate-500">
                  Applied to newly provisioned schools when they have no custom policy yet.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Min password length</label>
                    <input
                      type="number"
                      min={6}
                      max={32}
                      value={defaultSecurityPolicy.passwordMinLength}
                      onChange={(e) =>
                        setDefaultSecurityPolicy((p) => ({
                          ...p,
                          passwordMinLength: Math.min(32, Math.max(6, Number(e.target.value) || 6)),
                        }))
                      }
                      className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Session idle (minutes)</label>
                    <input
                      type="number"
                      min={0}
                      value={defaultSecurityPolicy.sessionIdleMinutes}
                      onChange={(e) =>
                        setDefaultSecurityPolicy((p) => ({
                          ...p,
                          sessionIdleMinutes: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={defaultSecurityPolicy.requireStrongPassword}
                    onChange={(e) =>
                      setDefaultSecurityPolicy((p) => ({ ...p, requireStrongPassword: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Require letter + number in passwords
                </label>
                <Button
                  loading={securitySaving}
                  onClick={async () => {
                    setSecuritySaving(true);
                    try {
                      const res = await fetch("/api/super-admin/platform-settings", {
                        method: "PATCH",
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ defaultSecurityPolicy }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Save failed");
                      await toast.fire({ icon: "success", title: "Default security template saved" });
                    } catch (err: unknown) {
                      await toast.fire({
                        icon: "error",
                        title: err instanceof Error ? err.message : "Save failed",
                      });
                    } finally {
                      setSecuritySaving(false);
                    }
                  }}
                >
                  Save default template
                </Button>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{s("twoFactor")}</p>
                      <p className="text-sm text-slate-500">{s("twoFactorHint")}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Platform operator MFA uses the same TOTP enrollment as school users (Profile → Security).
                        Enable only after operators are enrolled.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={requireOperatorMfa}
                      onChange={(e) => setRequireOperatorMfa(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    Require for SA login
                  </label>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{s("sessionTimeout")}</p>
                      <p className="text-sm text-slate-500">{s("sessionTimeoutHint")}</p>
                      <p className="text-xs font-mono text-slate-600 mt-1">JWT access TTL: {jwtAccessTtl} (env-controlled)</p>
                      <p className="text-xs text-slate-500 mt-1">Per-school idle logout remains in each school&apos;s Security settings.</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  loading={securitySaving}
                  onClick={async () => {
                    setSecuritySaving(true);
                    try {
                      const res = await fetch("/api/super-admin/platform-settings", {
                        method: "PATCH",
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ requireOperatorMfa }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Save failed");
                      await toast.fire({ icon: "success", title: "Platform MFA policy saved" });
                    } catch (err: unknown) {
                      await toast.fire({
                        icon: "error",
                        title: err instanceof Error ? err.message : "Save failed",
                      });
                    } finally {
                      setSecuritySaving(false);
                    }
                  }}
                >
                  Save operator MFA policy
                </Button>
              </div>

              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900">{s("securityWarning")}</p>
                  <p className="text-sm text-amber-700 leading-relaxed">{s("securityWarningText")}</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "DATABASE" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{s("databaseMaintenance")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:bg-slate-100 transition-all group">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{s("backupDatabase")}</p>
                    <p className="text-sm text-slate-500">{s("backupHint")}</p>
                  </button>
                  <button className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:bg-slate-100 transition-all group">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{s("optimizeTables")}</p>
                    <p className="text-sm text-slate-500">{s("optimizeHint")}</p>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "CREDENTIALS" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <EmailSettingsPanel accessToken={accessToken} />

              <div className="flex items-center justify-between border-t border-slate-100 pt-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{s("systemCredentials")}</h3>
                  <p className="text-sm text-slate-500">{s("credentialsSubtitle")}</p>
                </div>
                <Button size="compact" onClick={() => setIsAddingCred(true)}>
                  {s("addCredential")}
                </Button>
              </div>

              {isAddingCred && (
                <form onSubmit={handleAddCredential} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{s("name")}</label>
                      <input 
                        type="text" 
                        required
                        value={newCred.name}
                        onChange={(e) => setNewCred({ ...newCred, name: e.target.value })}
                        placeholder={s("namePlaceholder")}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{s("provider")}</label>
                      <select 
                        value={newCred.provider}
                        onChange={(e) => setNewCred({ ...newCred, provider: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="STRIPE">Stripe</option>
                        <option value="AWS">AWS</option>
                        <option value="TWILIO">Twilio</option>
                        <option value="SENDGRID">SendGrid</option>
                        <option value="RESEND">Resend</option>
                        <option value="MAILGUN">Mailgun</option>
                        <option value="AWS_SES">AWS SES</option>
                        <option value="SMTP">SMTP</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{s("keyClientId")}</label>
                      <input 
                        type="text" 
                        required
                        value={newCred.key}
                        onChange={(e) => setNewCred({ ...newCred, key: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{s("secret")}</label>
                      <input 
                        type="password" 
                        value={newCred.secret}
                        onChange={(e) => setNewCred({ ...newCred, secret: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="compact"
                      onClick={() => setIsAddingCred(false)}
                    >
                      {t("common:cancel")}
                    </Button>
                    <Button type="submit" size="compact">
                      {s("saveCredential")}
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {credentials.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium italic">{s("noCredentials")}</p>
                  </div>
                ) : (
                  credentials.map((cred) => (
                    <div key={cred.id} className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{cred.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cred.provider}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-mono text-slate-500">
                              {cred.key ? `${String(cred.key).substring(0, 8)}...` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s("created")}</p>
                          <p className="text-sm font-medium text-slate-600">{new Date(cred.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={s("deleteCredential")}
                          onClick={() => handleDeleteCredential(cred.id)}
                        >
                          <AlertCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "NOTIFICATIONS" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{s("emailNotifications")}</p>
                      <p className="text-sm text-slate-500">{s("emailNotificationsHint")}</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </Surface>
      </div>
    </PageShell>
  );
};
