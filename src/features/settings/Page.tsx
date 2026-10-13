import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Mail,
  School as SchoolIcon,
  Palette,
  Award,
  MapPin,
  Phone,
  Shield,
  Globe,
  Hash,
  CreditCard,
  Key,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsQuery } from "./hooks/useSettingsQuery";
import { settingsApi } from "./api";
import { GradeLegendModal } from "./components/GradeLegendModal";
import { TemplatePreviewModal } from "./components/TemplatePreviewModal";
import { AppearanceSettingsTab } from "./components/AppearanceSettingsTab";
import {
  GradingSettingsTab,
  type GradeLegend,
  type GradeScale,
} from "./components/GradingSettingsTab";
import {
  AttendancePayrollSettingsCard,
  type AttendancePayrollRulesForm,
} from "./components/AttendancePayrollSettingsCard";
import {
  LeavePoliciesSettingsCard,
  type LeavePolicyRow,
} from "./components/LeavePoliciesSettingsCard";
import { staffService } from "../../services/staffService";
import { SecuritySettingsTab, type SecurityPolicyForm } from "./components/SecuritySettingsTab";
import { ApiKeysSettingsCard } from "./components/ApiKeysSettingsCard";
import { NotificationsSettingsTab } from "./components/NotificationsSettingsTab";
import {
  SubscriptionSettingsTab,
  type SchoolSubscription,
} from "./components/SubscriptionSettingsTab";
import { SettingsChrome } from "./components/SettingsChrome";
import { CountryTimezoneFields } from "../../components/CountryTimezoneFields";
import {
  DEFAULT_COUNTRY,
  resolveCountryName,
  resolveTimezoneForCountry,
} from "../../lib/countryTimezones";
import { confirmAction } from "../../lib/swal";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import {
  cardShell,
  fieldInput,
  fieldLabel,
} from "../academics-shared/FeatureModalShell";
import {
  defaultNotificationPrefs,
  mergeNotificationPrefsFromApi,
  type NotificationPrefRow,
} from "../../lib/notificationPrefs";
import { applySchoolBrandToDocument, APP_BRAND_DEFAULT } from "../../lib/brandPalette";
import { useTranslation } from "react-i18next";
import { LanguageSelect } from "../../i18n/LanguageSelect";
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "../../i18n";
import { resolveGradeSheetTemplateKey } from "../gradesheets";
import {
  parseReceiptTemplatesFromSchool,
  receiptTemplatesPatchForRole,
  receiptTypesForRole,
  type ReceiptTemplateId,
  type ReceiptTypeKey,
  type ReceiptTemplatesByType,
} from "../receipts/registry";
import {
  DEFAULT_CERTIFICATE_DEFAULTS,
  parseCertificateDefaults,
  resolveCertificateTemplateKey,
  type CertificateDefaults,
} from "../certificates";
import {
  parseDocumentSignatories,
  type DocumentSignatories,
  type StaffSignatureRef,
} from "../../lib/documentSignatories";
import { hasEntitlement } from "../../lib/entitlements";

const DEFAULT_BRAND = APP_BRAND_DEFAULT;

const DEFAULT_SECURITY: SecurityPolicyForm = {
  passwordMinLength: 6,
  requireStrongPassword: false,
  sessionIdleMinutes: 0,
  forcePasswordChangeDays: 0,
  mfaMode: "OFF",
  mfaRequiredRoles: [],
  allowSmsMfa: false,
};

const TAB_IDS = [
  "GENERAL",
  "APPEARANCE",
  "GRADING",
  "SECURITY",
  "API_KEYS",
  "NOTIFICATIONS",
  "PLAN",
] as const;

type TabId = (typeof TAB_IDS)[number];

function parseTab(raw: string | null, receiptTemplateOnly = false): TabId {
  const u = (raw || "").toUpperCase();
  if ((TAB_IDS as readonly string[]).includes(u)) return u as TabId;
  return receiptTemplateOnly ? "APPEARANCE" : "GENERAL";
}

const DEFAULT_SCALES: GradeScale[] = [
  { minScore: 90, maxScore: 100, gradeLetter: "A", gpaPoints: 4.0, remark: "Excellent" },
  { minScore: 80, maxScore: 89, gradeLetter: "B", gpaPoints: 3.0, remark: "Very Good" },
  { minScore: 70, maxScore: 79, gradeLetter: "C", gpaPoints: 2.0, remark: "Good" },
  { minScore: 60, maxScore: 69, gradeLetter: "D", gpaPoints: 1.0, remark: "Pass" },
  { minScore: 0, maxScore: 59, gradeLetter: "F", gpaPoints: 0.0, remark: "Fail" },
];

export const Settings = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { school, setSchool, user, accessToken, entitlements } = useAuthStore();
  const {
    schoolData,
    gradeLegends,
    loading,
    invalidate: refetchSettings,
    refetchAll,
  } = useSettingsQuery();

  const { toast, showToast } = usePageToast();

  const canManageFullSettings = ["SCHOOL_ADMIN", "IT_ADMIN"].includes(user?.role || "");
  const canManageReceiptTemplate = ["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL", "REGISTRAR", "ACCOUNTANT"].includes(
    user?.role || ""
  );
  const receiptTemplateOnly = canManageReceiptTemplate && !canManageFullSettings;

  const activeTab = parseTab(searchParams.get("tab"), receiptTemplateOnly);
  const setActiveTab = (id: TabId) => {
    const next = new URLSearchParams(searchParams);
    if (id === "GENERAL") next.delete("tab");
    else next.set("tab", id);
    setSearchParams(next, { replace: true });
  };
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [subscription, setSubscription] = React.useState<SchoolSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = React.useState(false);
  const [subscriptionError, setSubscriptionError] = React.useState("");

  const [isLegendModalOpen, setIsLegendModalOpen] = React.useState(false);
  const [editingLegend, setEditingLegend] = React.useState<GradeLegend | null>(null);
  const [newLegendName, setNewLegendName] = React.useState("");
  const [newLegendCategory, setNewLegendCategory] = React.useState("CLASS");
  const [newScales, setNewScales] = React.useState<GradeScale[]>(DEFAULT_SCALES);
  const [gradingSubTab, setGradingSubTab] = React.useState<"SCALES" | "STRUCTURE">(
    "SCALES"
  );

  const [gradebookColumns, setGradebookColumns] = React.useState<any[]>([
    { id: "homework", name: "Homework", code: "HW", weightPct: 20, isActive: true },
    { id: "quizzes", name: "Quizzes", code: "QZ", weightPct: 20, isActive: true },
    { id: "classwork", name: "Class work", code: "CW", weightPct: 10, isActive: true },
    { id: "midterm", name: "Midterm exam", code: "MID", weightPct: 20, isActive: true },
    { id: "final", name: "Final exam", code: "FIN", weightPct: 30, isActive: true },
  ]);

  const [schoolName, setSchoolName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [country, setCountry] = React.useState(DEFAULT_COUNTRY);
  const [timezone, setTimezone] = React.useState("UTC");
  const [defaultLocale, setDefaultLocale] = React.useState<AppLocale>(DEFAULT_LOCALE);
  const [guideRequired, setGuideRequired] = React.useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [gradeSheetTemplate, setGradeSheetTemplate] = React.useState("TEMPLATE_1");
  const [reportCardTemplate, setReportCardTemplate] = React.useState("TEMPLATE_1");
  const [certificateTemplate, setCertificateTemplate] = React.useState("CERT_CLASSIC_BROWN");
  const [certificateDefaults, setCertificateDefaults] = React.useState<CertificateDefaults>({
    ...DEFAULT_CERTIFICATE_DEFAULTS,
  });
  const [documentSignatories, setDocumentSignatories] = React.useState<DocumentSignatories>({});
  const [staffForSignatures, setStaffForSignatures] = React.useState<StaffSignatureRef[]>([]);
  const [brandColor, setBrandColor] = React.useState(DEFAULT_BRAND);
  const [securityPolicy, setSecurityPolicy] =
    React.useState<SecurityPolicyForm>(DEFAULT_SECURITY);
  const [notificationPrefs, setNotificationPrefs] = React.useState<NotificationPrefRow[]>(
    () => defaultNotificationPrefs()
  );
  const [pendingNotificationRemovals, setPendingNotificationRemovals] = React.useState<
    string[]
  >([]);
  const [attendanceRules, setAttendanceRules] = React.useState<AttendancePayrollRulesForm>({
    enabled: false,
    graceMinutes: 15,
    deductionPerMissingDay: 0,
    deductionPerLate: 0,
    blockNonInstructionalRollCall: true,
    publishRollCallToCalendar: true,
  });
  const [leavePolicies, setLeavePolicies] = React.useState<LeavePolicyRow[]>([]);
  const [previewTemplate, setPreviewTemplate] = React.useState<string | null>(null);
  const [previewType, setPreviewType] = React.useState<"GRADE" | "REPORT" | "CERT" | "RECEIPT">("GRADE");
  const [previewReceiptType, setPreviewReceiptType] = React.useState<ReceiptTypeKey>("FEE_PAYMENT");
  const [receiptTemplates, setReceiptTemplates] = React.useState<ReceiptTemplatesByType>(() =>
    parseReceiptTemplatesFromSchool({})
  );

  const canManageLeavePolicies = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"].includes(
    user?.role || ""
  );

  const receiptTypeKeys = React.useMemo(
    () => receiptTypesForRole(user?.role),
    [user?.role]
  );

  const syncFromSchool = React.useCallback((s: any) => {
    if (!s) return;
    setSchoolName(s.name || "");
    setContactEmail(s.contactEmail || "");
    setContactPhone(s.contactPhone || "");
    setAddress(s.address || "");
    setDefaultLocale(normalizeLocale(s.defaultLocale) || DEFAULT_LOCALE);
    setGuideRequired(Boolean(s.guideRequired));
    const c = resolveCountryName(s.country || DEFAULT_COUNTRY);
    setCountry(c);
    setTimezone(resolveTimezoneForCountry(c, s.timezone || "UTC"));
    setLogoPreview(s.logoUrl || null);
    setGradeSheetTemplate(resolveGradeSheetTemplateKey(s.gradeSheetTemplate || "TEMPLATE_1"));
    setReportCardTemplate(s.reportCardTemplate || "TEMPLATE_1");
    setCertificateTemplate(
      resolveCertificateTemplateKey(s.certificateTemplate || "CERT_CLASSIC_BROWN")
    );
    setReceiptTemplates(parseReceiptTemplatesFromSchool(s, user?.role));
    setCertificateDefaults(parseCertificateDefaults(s.certificateDefaults));
    setDocumentSignatories(parseDocumentSignatories(s.documentSignatories));
    setBrandColor(s.brandColor || DEFAULT_BRAND);
    try {
      if (s.gradebookConfig) {
        const parsed = JSON.parse(s.gradebookConfig);
        if (Array.isArray(parsed) && parsed.length) setGradebookColumns(parsed);
      }
    } catch {
      /* keep defaults */
    }

    const r = s.payrollAttendanceRules;
    if (r && typeof r === "object") {
      setAttendanceRules({
        enabled: Boolean(r.enabled),
        graceMinutes: Number(r.graceMinutes) || 0,
        deductionPerMissingDay: Number(r.deductionPerMissingDay) || 0,
        deductionPerLate: Number(r.deductionPerLate) || 0,
        blockNonInstructionalRollCall:
          r.blockNonInstructionalRollCall !== undefined
            ? Boolean(r.blockNonInstructionalRollCall)
            : true,
        publishRollCallToCalendar:
          r.publishRollCallToCalendar !== undefined
            ? Boolean(r.publishRollCallToCalendar)
            : true,
      });
    }

    const sp = s.securityPolicy;
    if (sp && typeof sp === "object") {
      setSecurityPolicy({
        passwordMinLength: Math.min(32, Math.max(6, Number(sp.passwordMinLength) || 6)),
        requireStrongPassword: Boolean(sp.requireStrongPassword),
        sessionIdleMinutes: Math.max(0, Number(sp.sessionIdleMinutes) || 0),
        forcePasswordChangeDays: Math.max(0, Number(sp.forcePasswordChangeDays) || 0),
        mfaMode: sp.mfaMode === "OPTIONAL" || sp.mfaMode === "REQUIRED" ? sp.mfaMode : "OFF",
        mfaRequiredRoles: Array.isArray(sp.mfaRequiredRoles) ? sp.mfaRequiredRoles.map(String) : [],
        allowSmsMfa: Boolean(sp.allowSmsMfa),
      });
    } else {
      setSecurityPolicy(DEFAULT_SECURITY);
    }
  }, [user?.role]);

  // Consolidated syncFromSchool - runs when either schoolData or school changes
  React.useEffect(() => {
    const source = schoolData || school;
    if (source) syncFromSchool(source);
  }, [schoolData, school, syncFromSchool]);

  React.useEffect(() => {
    if (!school?.id) return;
    void settingsApi
      .fetchNotificationPrefs(school.id)
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setNotificationPrefs(mergeNotificationPrefsFromApi(rows));
        setPendingNotificationRemovals([]);
      })
      .catch((err) => {
        console.error("Failed to fetch notification prefs:", err);
        showToast(t("settings.toast.notificationPrefsLoadFailed"), "error");
      });
  }, [school?.id, showToast]);

  React.useEffect(() => {
    if (!school?.id || !canManageLeavePolicies) return;
    void staffService
      .getLeavePolicies(school.id)
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setLeavePolicies(
          rows.map((r: any) => ({
            id: r.id,
            type: r.type,
            annualDays: Number(r.annualDays) || 0,
            isActive: r.isActive !== false,
          }))
        );
      })
      .catch(() => undefined);
  }, [school?.id, canManageLeavePolicies]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!school?.id || !accessToken) {
        setStaffForSignatures([]);
        return;
      }
      try {
        const res = await fetch(`/api/schools/${school.id}/staff`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStaffForSignatures(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setStaffForSignatures([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school?.id, accessToken]);

  // Live-preview brand while editing Appearance (restore saved brand when leaving tab).
  React.useEffect(() => {
    if (activeTab !== "APPEARANCE") return;
    applySchoolBrandToDocument(brandColor);
    return () => applySchoolBrandToDocument(school?.brandColor || null);
  }, [activeTab, brandColor, school?.brandColor]);

  const loadSubscription = React.useCallback(async () => {
    if (!school?.id) return;
    setSubscriptionLoading(true);
    setSubscriptionError("");
    try {
      const data = (await settingsApi.fetchSubscription(school.id)) as SchoolSubscription;
      setSubscription(data);
    } catch (err) {
      setSubscription(null);
      setSubscriptionError(
        err instanceof Error ? err.message : "Could not load subscription details"
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }, [school?.id]);

  React.useEffect(() => {
    if (activeTab !== "PLAN" || !school?.id) return;
    void loadSubscription();
  }, [activeTab, school?.id, loadSubscription]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const result = await refetchAll();
    const fresh = result.data?.schoolData || schoolData;
    if (fresh) syncFromSchool(fresh);
    if (school?.id) {
      try {
        const rows = await settingsApi.fetchNotificationPrefs(school.id);
        if (Array.isArray(rows)) {
          setNotificationPrefs(mergeNotificationPrefsFromApi(rows));
          setPendingNotificationRemovals([]);
        }
      } catch {
        /* ignore */
      }
      if (activeTab === "PLAN") {
        await loadSubscription();
      }
    }
    setRefreshing(false);
  };

  const legends: GradeLegend[] = React.useMemo(
    () => (Array.isArray(gradeLegends) ? gradeLegends : []),
    [gradeLegends]
  );

  const canManageApiKeys = ["SCHOOL_ADMIN", "IT_ADMIN"].includes(user?.role || "");
  const apiAccessEnabled = hasEntitlement(entitlements, "api_access");
  const isItAdmin = user?.role === "IT_ADMIN";

  const allTabs = [
    { id: "GENERAL", label: t("settings.tabs.general"), icon: SchoolIcon },
    { id: "APPEARANCE", label: t("settings.tabs.appearance"), icon: Palette },
    { id: "GRADING", label: t("settings.tabs.grading"), icon: Award },
    { id: "SECURITY", label: t("settings.tabs.security"), icon: Shield },
    { id: "API_KEYS", label: t("settings.tabs.apiKeys"), icon: Key },
    { id: "NOTIFICATIONS", label: t("settings.tabs.notifications"), icon: Bell },
    { id: "PLAN", label: t("settings.tabs.plan"), icon: CreditCard },
  ] as const;

  const tabs = isItAdmin
    ? allTabs.filter((tab) => ["SECURITY", "API_KEYS"].includes(tab.id))
    : receiptTemplateOnly
      ? allTabs.filter((tab) => tab.id === "APPEARANCE")
      : [...allTabs];

  React.useEffect(() => {
    if (receiptTemplateOnly && activeTab !== "APPEARANCE") {
      setActiveTab("APPEARANCE");
    }
  }, [receiptTemplateOnly, activeTab]);

  React.useEffect(() => {
    if (!isItAdmin) return;
    if (!["SECURITY", "API_KEYS"].includes(activeTab)) {
      setActiveTab("SECURITY");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isItAdmin, activeTab]);

  const handleAddScale = () => {
    setNewScales([
      ...newScales,
      { minScore: 0, maxScore: 0, gradeLetter: "", gpaPoints: 0, remark: "" },
    ]);
  };

  const handleRemoveScale = (index: number) => {
    setNewScales(newScales.filter((_, i) => i !== index));
  };

  const handleScaleChange = (index: number, field: keyof GradeScale, value: any) => {
    const updated = [...newScales];
    updated[index] = { ...updated[index], [field]: value };
    setNewScales(updated);
  };

  const handleSaveLegend = async () => {
    if (!school?.id || !newLegendName) return;
    setSaving(true);
    try {
      if (editingLegend) {
        await settingsApi.updateGradeLegend(school.id, editingLegend.id, {
          name: newLegendName,
          category: newLegendCategory,
          scales: newScales,
        });
      } else {
        await settingsApi.createGradeLegend(school.id, {
          name: newLegendName,
          category: newLegendCategory,
          scales: newScales,
        });
      }
      setIsLegendModalOpen(false);
      setEditingLegend(null);
      setNewLegendName("");
      setNewLegendCategory("CLASS");
      setNewScales(DEFAULT_SCALES);
      refetchSettings();
      showToast(t("settings.toast.legendSaved"));
    } catch (err: any) {
      showToast(err.message || t("settings.toast.legendSaveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLegend = async (id: string) => {
    if (!school?.id) return;
    const ok = await confirmAction({
      title: t("settings.confirm.deleteLegendTitle"),
      text: t("settings.confirm.deleteLegendText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await settingsApi.deleteGradeLegend(school.id, id);
      refetchSettings();
      showToast(t("settings.toast.legendDeleted"));
    } catch (err: any) {
      showToast(err.message || t("settings.toast.legendDeleteFailed"), "error");
    }
  };

  const openEditModal = (legend: GradeLegend) => {
    setEditingLegend(legend);
    setNewLegendName(legend.name);
    setNewLegendCategory(legend.category || "CLASS");
    setNewScales(legend.scales);
    setIsLegendModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast(t("settings.toast.logoTooLarge"), "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!school?.id) return;
    if (receiptTemplateOnly) {
      setSaving(true);
      try {
        const updatedSchool = await settingsApi.updateReceiptTemplate(school.id, {
          receiptTemplates: receiptTemplatesPatchForRole(user?.role, receiptTemplates),
        });
        setSchool(updatedSchool);
        syncFromSchool(updatedSchool);
        refetchSettings();
        showToast(t("common:successSaved"));
      } catch (err: any) {
        showToast(err.message || t("settings.toast.saveFailed"), "error");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!schoolName.trim() || !contactEmail.trim()) {
      showToast(t("settings.toast.nameEmailRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      const updatedSchool = await settingsApi.updateSchool(school.id, {
        name: schoolName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || null,
        address: address.trim() || null,
        country,
        timezone,
        defaultLocale,
        guideRequired,
        logoUrl: logoPreview,
        gradeSheetTemplate,
        reportCardTemplate,
        certificateTemplate,
        certificateDefaults,
        documentSignatories,
        brandColor,
        payrollAttendanceRules: attendanceRules,
      });
      let latestSchool = updatedSchool;
      if (canManageReceiptTemplate) {
        latestSchool = await settingsApi.updateReceiptTemplate(school.id, {
          receiptTemplates: receiptTemplatesPatchForRole(user?.role, receiptTemplates),
        });
      }
      setSchool({
        ...latestSchool,
        defaultLocale: latestSchool.defaultLocale ?? defaultLocale,
        guideRequired: latestSchool.guideRequired ?? guideRequired,
      });
      syncFromSchool(latestSchool);
      refetchSettings();
      showToast(t("common:successSaved"));
    } catch (err: any) {
      showToast(err.message || t("settings.toast.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendanceOnly = async () => {
    if (!school?.id) return;
    setSaving(true);
    try {
      const updatedSchool = await settingsApi.updateSchool(school.id, {
        payrollAttendanceRules: attendanceRules,
      });
      setSchool(updatedSchool);
      syncFromSchool(updatedSchool);
      refetchSettings();
      showToast(t("settings.toast.attendanceSaved"));
    } catch (err: any) {
      showToast(err.message || t("settings.toast.attendanceSaveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLeavePolicies = async () => {
    if (!school?.id) return;
    setSaving(true);
    try {
      const updated = await staffService.updateLeavePolicies(
        school.id,
        leavePolicies.map((p) => ({
          type: p.type,
          annualDays: p.annualDays,
          isActive: p.isActive,
        }))
      );
      setLeavePolicies(
        (Array.isArray(updated) ? updated : []).map((r: any) => ({
          id: r.id,
          type: r.type,
          annualDays: Number(r.annualDays) || 0,
          isActive: r.isActive !== false,
        }))
      );
      showToast(t("settings.leavePolicies.saved"));
    } catch (err: any) {
      showToast(err.message || t("settings.leavePolicies.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!school?.id) return;
    setSaving(true);
    try {
      const updatedSchool = await settingsApi.updateSchool(school.id, {
        securityPolicy,
      });
      setSchool(updatedSchool);
      syncFromSchool(updatedSchool);
      refetchSettings();
      showToast(t("settings.toast.securitySaved"));
    } catch (err: any) {
      showToast(err.message || t("settings.toast.securitySaveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!school?.id) return;
    setSaving(true);
    try {
      const rows = await settingsApi.updateNotificationPrefs(school.id, {
        preferences: notificationPrefs.map((p) => ({
          eventKey: p.eventKey,
          emailEnabled: p.emailEnabled,
          inAppEnabled: p.inAppEnabled,
          label: p.label ?? null,
          description: p.description ?? null,
        })),
        removeEventKeys: pendingNotificationRemovals,
      });
      if (Array.isArray(rows)) {
        setNotificationPrefs(mergeNotificationPrefsFromApi(rows));
        setPendingNotificationRemovals([]);
      }
      showToast(t("settings.toast.notificationsSaved"));
    } catch (err: any) {
      showToast(err.message || t("settings.toast.notificationsSaveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const displaySchool = schoolData || school;
  const showSave =
    activeTab === "GENERAL" || activeTab === "APPEARANCE";

  if (loading && !schoolData && !school) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
        <div className={`${cardShell} h-36 animate-pulse bg-slate-50`} />
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-56 h-64 rounded-2xl bg-slate-100 animate-pulse" />
          <div className={`${cardShell} flex-1 h-80 animate-pulse bg-slate-50`} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <SettingsChrome
        title={receiptTemplateOnly ? t("settings.receiptTemplate") : undefined}
        subtitle={receiptTemplateOnly ? t("settings.receiptTemplateHint") : undefined}
        showSave={showSave}
        saving={saving}
        refreshing={refreshing}
        onSave={handleSave}
        onRefresh={handleRefresh}
      />

      {activeTab === "GENERAL" && (
        <>
          <AttendancePayrollSettingsCard
            rules={attendanceRules}
            setRules={setAttendanceRules}
            saving={saving}
            onSave={() => void handleSaveAttendanceOnly()}
          />
          {canManageLeavePolicies && (
            <LeavePoliciesSettingsCard
              policies={leavePolicies}
              setPolicies={setLeavePolicies}
              saving={saving}
              onSave={() => void handleSaveLeavePolicies()}
            />
          )}
        </>
      )}

      <div className={receiptTemplateOnly ? "w-full" : "flex flex-col lg:flex-row gap-8"}>
        {!receiptTemplateOnly && (
        <nav className={`lg:w-56 shrink-0 p-3 space-y-1 ${cardShell}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        )}

        <div className={`${receiptTemplateOnly ? "w-full" : "flex-1"} ${cardShell} p-8 space-y-8 min-w-0`}>
          {activeTab === "GENERAL" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                  School profile
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Contact details and regional defaults used across the portal.
                </p>
              </div>

              {(displaySchool?.slug ||
                displaySchool?.schoolCode ||
                displaySchool?.status) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Slug
                    </p>
                    <p className="text-sm font-mono font-bold text-slate-800 mt-1">
                      /{displaySchool.slug}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> School code
                    </p>
                    <p className="text-sm font-mono font-bold text-slate-800 mt-1">
                      {displaySchool.schoolCode || "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-1 uppercase tracking-wide">
                      {displaySchool.status || "—"}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={fieldLabel} htmlFor="school-name">
                    School name
                  </label>
                  <input
                    id="school-name"
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className={fieldInput}
                    required
                  />
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="school-email">
                    Contact email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="school-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={`${fieldInput} pl-11`}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="school-phone">
                    Contact phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="school-phone"
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className={`${fieldInput} pl-11`}
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="school-address">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="school-address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={`${fieldInput} pl-11`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Regional settings
                </h3>
                <CountryTimezoneFields
                  country={country}
                  timezone={timezone}
                  onCountryChange={setCountry}
                  onTimezoneChange={setTimezone}
                />
                <LanguageSelect
                  id="school-default-locale"
                  value={defaultLocale}
                  label={t("common:schoolDefaultLanguage")}
                  hint={t("common:schoolDefaultLanguageHint")}
                  applyImmediately={false}
                  onChange={setDefaultLocale}
                />
                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={guideRequired}
                    onChange={(e) => setGuideRequired(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      {t("guide.guideRequiredLabel", { ns: "pages" })}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {t("guide.guideRequiredHint", { ns: "pages" })}
                    </span>
                  </span>
                </label>
              </div>
            </motion.div>
          )}

          {activeTab === "APPEARANCE" && (
            <AppearanceSettingsTab
              logoPreview={logoPreview}
              brandColor={brandColor}
              gradeSheetTemplate={gradeSheetTemplate}
              reportCardTemplate={reportCardTemplate}
              certificateTemplate={certificateTemplate}
              certificateDefaults={certificateDefaults}
              documentSignatories={documentSignatories}
              staff={staffForSignatures}
              handleLogoChange={handleLogoChange}
              onRemoveLogo={() => setLogoPreview(null)}
              setBrandColor={setBrandColor}
              setGradeSheetTemplate={setGradeSheetTemplate}
              setReportCardTemplate={setReportCardTemplate}
              setCertificateTemplate={setCertificateTemplate}
              setCertificateDefaults={setCertificateDefaults}
              setDocumentSignatories={setDocumentSignatories}
              setPreviewType={setPreviewType}
              setPreviewTemplate={setPreviewTemplate}
              setPreviewReceiptType={setPreviewReceiptType}
              receiptTemplates={receiptTemplates}
              receiptTypeKeys={receiptTypeKeys}
              setReceiptTemplateForType={(type, id) =>
                setReceiptTemplates((prev) => ({ ...prev, [type]: id }))
              }
              schoolId={school?.id}
              schoolName={schoolName}
              address={address}
              receiptTemplateOnly={receiptTemplateOnly}
            />
          )}

          {activeTab === "GRADING" && (
            <GradingSettingsTab
              gradingSubTab={gradingSubTab}
              setGradingSubTab={setGradingSubTab}
              legends={legends}
              setEditingLegend={setEditingLegend}
              setNewLegendName={setNewLegendName}
              setNewLegendCategory={setNewLegendCategory}
              setNewScales={setNewScales}
              setIsLegendModalOpen={setIsLegendModalOpen}
              openEditModal={openEditModal}
              handleDeleteLegend={handleDeleteLegend}
              gradebookColumns={gradebookColumns}
              setGradebookColumns={setGradebookColumns}
              schoolId={school?.id}
              setSchool={setSchool}
              saving={saving}
              setSaving={setSaving}
              showToast={showToast}
            />
          )}

          {activeTab === "SECURITY" && (
            <>
              <SecuritySettingsTab
                policy={securityPolicy}
                setPolicy={setSecurityPolicy}
                saving={saving}
                onSave={() => void handleSaveSecurity()}
              />
            </>
          )}

          {activeTab === "API_KEYS" && canManageApiKeys && school?.id && (
            <ApiKeysSettingsCard
              schoolId={school.id}
              enabled={apiAccessEnabled}
              showToast={showToast}
            />
          )}

          {activeTab === "NOTIFICATIONS" && (
            <NotificationsSettingsTab
              prefs={notificationPrefs}
              setPrefs={setNotificationPrefs}
              saving={saving}
              onSave={() => void handleSaveNotifications()}
              pendingRemovals={pendingNotificationRemovals}
              setPendingRemovals={setPendingNotificationRemovals}
            />
          )}

          {activeTab === "PLAN" && (
            <SubscriptionSettingsTab
              subscription={subscription}
              loading={subscriptionLoading || refreshing}
              error={subscriptionError}
              onRefresh={() => void loadSubscription()}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isLegendModalOpen && (
          <GradeLegendModal
            editingLegend={editingLegend}
            handleAddScale={handleAddScale}
            handleRemoveScale={handleRemoveScale}
            handleSaveLegend={handleSaveLegend}
            handleScaleChange={handleScaleChange}
            newLegendCategory={newLegendCategory}
            newLegendName={newLegendName}
            newScales={newScales}
            saving={saving}
            setIsLegendModalOpen={setIsLegendModalOpen}
            setNewLegendCategory={setNewLegendCategory}
            setNewLegendName={setNewLegendName}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewTemplate && (
          <TemplatePreviewModal
            previewTemplate={previewTemplate}
            previewType={previewType}
            schoolId={school?.id}
            schoolName={schoolName}
            address={address}
            logoUrl={logoPreview}
            brandColor={brandColor}
            setGradeSheetTemplate={setGradeSheetTemplate}
            setPreviewTemplate={setPreviewTemplate}
            setReportCardTemplate={setReportCardTemplate}
            setCertificateTemplate={setCertificateTemplate}
            setReceiptTemplateForType={(type, id) =>
              setReceiptTemplates((prev) => ({ ...prev, [type]: id }))
            }
            previewReceiptType={previewReceiptType}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
