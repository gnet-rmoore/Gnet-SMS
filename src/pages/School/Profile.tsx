import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Camera,
  Save,
  Calendar,
  RefreshCw,
  ImagePlus,
  Trash2,
  BadgeCheck,
  Copy,
  Check,
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { UserAvatar } from "../../components/UserAvatar";
import { compressProfileImage, validateProfileImageFile } from "../../lib/profileImage";
import { USER_PHOTO_QUERY_ROOTS } from "../../lib/avatarPhoto";
import { PageToast, usePageToast } from "../../features/academics-shared/PageToast";
import { SignaturePadCard } from "../../components/SignaturePadCard";
import { canManageOfficialSignature } from "../../constants/roles";
import { LanguageSelect } from "../../i18n/LanguageSelect";
import {
  changeAppLocale,
  DEFAULT_LOCALE,
  getStoredLocale,
  normalizeLocale,
  type AppLocale,
} from "../../i18n";
import { persistPreferredLocale as savePreferredLocale } from "../../i18n/persistPreferredLocale";
import { translateApiError } from "../../i18n/apiErrors";
import { SecurityTab } from "../../features/profile/components/SecurityTab";

type Section = "profile" | "security";

const fieldClass =
  "w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 rounded-xl outline-none text-slate-900 font-medium transition-all text-sm";

function formatRole(r: string) {
  if (!r) return "";
  return r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Profile = () => {
  const { t } = useTranslation(["pages", "common"]);
  const p = (key: string, opts?: Record<string, unknown>): string =>
    t(`profile.${key}`, opts as any) as string;
  const { user, accessToken, school, updateUser, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast, showToast } = usePageToast();
  const [section, setSection] = useState<Section>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    photoUrl: "",
    signatureUrl: "",
    role: "",
    gender: "",
    dob: "",
    joiningDate: "",
    isActive: true,
  });
  const [preferredLocale, setPreferredLocale] = useState<AppLocale>(
    () => normalizeLocale(user?.preferredLocale) || DEFAULT_LOCALE
  );
  const [signatureBusy, setSignatureBusy] = useState(false);

  /** Pending compressed photo preview before save */
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.id) void fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/users/${user?.id}`);
      const locale =
        normalizeLocale(data.preferredLocale) ||
        normalizeLocale(user?.preferredLocale) ||
        getStoredLocale() ||
        DEFAULT_LOCALE;
      setPreferredLocale(locale);
      setProfileData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        photoUrl: data.photoUrl || "",
        signatureUrl: data.signatureUrl || "",
        role: data.role || "",
        gender: data.gender || "",
        dob: data.dob ? new Date(data.dob).toISOString().split("T")[0] : "",
        joiningDate: data.joiningDate
          ? new Date(data.joiningDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "",
        isActive: data.isActive !== undefined ? data.isActive : true,
      });
      // Keep session in sync (photo / name / locale) for Layout + UserAvatar
      updateUser({
        name: data.name,
        email: data.email,
        photoUrl: data.photoUrl ?? null,
        signatureUrl: data.signatureUrl ?? null,
        phone: data.phone,
        address: data.address,
        gender: data.gender,
        dob: data.dob || null,
        preferredLocale: normalizeLocale(data.preferredLocale) ?? user?.preferredLocale ?? locale,
      });
      await changeAppLocale(locale);
    } catch (err: any) {
      showToast(translateApiError(err) || err.message || p("loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  };

  const persistPreferredLocale = async (locale: AppLocale) => {
    if (!user?.id) return;
    setPreferredLocale(locale);
    try {
      const next = await savePreferredLocale(locale);
      setPreferredLocale(next);
      showToast(t("common:languageSaved"), "success");
    } catch (err: any) {
      showToast(translateApiError(err) || err.message || t("common:errorGeneric"), "error");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const processImageFile = async (file: File) => {
    const validation = validateProfileImageFile(file);
    if (validation) {
      showToast(validation, "error");
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await compressProfileImage(file);
      setPhotoPreview(dataUrl);
    } catch (err: any) {
      showToast(err.message || p("imageProcessFailed"), "error");
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processImageFile(file);
  };

  const broadcastPhotoChange = () => {
    for (const root of USER_PHOTO_QUERY_ROOTS) {
      void queryClient.invalidateQueries({ queryKey: [root] });
    }
  };

  const persistPhoto = async (photoUrl: string | null) => {
    if (!user?.id) return;
    setPhotoBusy(true);
    try {
      const updated = await api.patch(`/api/users/${user.id}`, { photoUrl });
      const next = updated.photoUrl ?? photoUrl;
      setProfileData((prev) => ({ ...prev, photoUrl: next || "" }));
      updateUser({ photoUrl: next || null });
      setPhotoPreview(null);
      broadcastPhotoChange();
      showToast(next ? p("photoUpdated") : p("photoRemoved"), "success");
    } catch (err: any) {
      showToast(err.message || p("photoUpdateFailed"), "error");
    } finally {
      setPhotoBusy(false);
    }
  };

  const persistSignature = async (signatureUrl: string | null) => {
    if (!user?.id) return;
    setSignatureBusy(true);
    try {
      const updated = await api.patch(`/api/users/${user.id}`, { signatureUrl });
      const next = updated.signatureUrl ?? signatureUrl;
      setProfileData((prev) => ({ ...prev, signatureUrl: next || "" }));
      updateUser({ signatureUrl: next || null });
      showToast(next ? p("signatureSaved") : p("signatureRemoved"), "success");
    } catch (err: any) {
      showToast(err.message || p("signatureUpdateFailed"), "error");
      throw err;
    } finally {
      setSignatureBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      // Apply pending photo preview in the same save so users are not stuck with preview-only.
      const photoToSave = photoPreview ?? profileData.photoUrl ?? null;
      const updatedUser = await api.patch(`/api/users/${user.id}`, {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone || null,
        address: profileData.address || null,
        gender: profileData.gender || null,
        dob: profileData.dob ? new Date(profileData.dob) : null,
        photoUrl: photoToSave || null,
        preferredLocale,
      });

      const nextLocale =
        normalizeLocale(updatedUser.preferredLocale) || preferredLocale || DEFAULT_LOCALE;

      setAuth(
        {
          ...user,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          address: updatedUser.address,
          photoUrl: updatedUser.photoUrl,
          gender: updatedUser.gender,
          dob: updatedUser.dob,
          preferredLocale: nextLocale,
        },
        accessToken || ""
      );
      setPreferredLocale(nextLocale);
      await changeAppLocale(nextLocale);
      setProfileData((prev) => ({
        ...prev,
        name: updatedUser.name || prev.name,
        email: updatedUser.email || prev.email,
        phone: updatedUser.phone || "",
        address: updatedUser.address || "",
        photoUrl: updatedUser.photoUrl || "",
        gender: updatedUser.gender || "",
      }));
      setPhotoPreview(null);
      broadcastPhotoChange();
      showToast(t("common:successSaved"), "success");
    } catch (err: any) {
      showToast(translateApiError(err) || err.message || p("saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (payload: {
    currentPassword: string;
    password: string;
  }) => {
    setSaving(true);
    try {
      await api.patch(`/api/users/${user?.id}`, {
        password: payload.password,
        currentPassword: payload.currentPassword,
      });
      updateUser({ mustChangePassword: false });
      showToast(p("passwordUpdated"), "success");
    } catch (err: any) {
      throw Object.assign(new Error(translateApiError(err) || err.message || p("passwordUpdateFailed")), {
        code: err?.code,
        status: err?.status,
      });
    } finally {
      setSaving(false);
    }
  };

  const displayPhoto = photoPreview || profileData.photoUrl;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">{t("common:loading")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 text-white overflow-hidden shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
      >
        <div className="p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center gap-8">
          <div className="relative shrink-0 mx-auto sm:mx-0">
            <div
              className={`relative ${dragOver ? "ring-4 ring-indigo-400 ring-offset-2 ring-offset-slate-900" : ""} rounded-[32px]`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={profileData.name}
                  referrerPolicy="no-referrer"
                  className="w-28 h-28 rounded-[32px] object-cover border border-white/10 shadow-lg"
                />
              ) : (
                <UserAvatar
                  userId={user?.id}
                  name={profileData.name}
                  photoUrl={null}
                  size="xl"
                  rounded="3xl"
                  preferSessionPhoto={false}
                  className="!w-28 !h-28"
                />
              )}
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border border-indigo-400/30 transition-colors disabled:opacity-60"
                title={p("changePhoto")}
              >
                {photoBusy ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/10 text-slate-200 border border-white/10">
                <BadgeCheck className="w-3.5 h-3.5 text-indigo-300" />
                {formatRole(profileData.role)}
              </span>
              {profileData.isActive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
                  Active
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate font-dashboard">
              {profileData.name || t("pages:profile.title")}
            </h1>
            <p className="text-sm text-slate-400 flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {profileData.email}
              </span>
              {profileData.joiningDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {p("joined", { date: profileData.joiningDate })}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              {t("pages:profile.subtitle")}
            </p>
          </div>

          {user?.id && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(user.id);
                setCopiedId(true);
                window.setTimeout(() => setCopiedId(false), 2000);
              }}
              className="shrink-0 self-center sm:self-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-colors font-mono"
              title={p("copyUserId")}
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {user.id.slice(0, 8)}…
            </button>
          )}
        </div>
      </motion.div>

      {/* Photo confirm bar */}
      <AnimatePresence>
        {photoPreview && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <img
              src={photoPreview}
              alt={p("previewAlt")}
              className="w-16 h-16 rounded-2xl object-cover border border-indigo-100 mx-auto sm:mx-0"
            />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-extrabold tracking-tight text-slate-900">{p("photoPreviewTitle")}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {p("photoPreviewHint")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => setPhotoPreview(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => void persistPhoto(photoPreview)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-60"
              >
                {photoBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {p("applyPhoto")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section switch */}
      <div className="flex gap-2 p-1 rounded-2xl bg-slate-100/80 border border-slate-100 w-fit">
        {(
          [
            { id: "profile" as const, label: p("tabs.profile"), icon: User },
            { id: "security" as const, label: p("tabs.security"), icon: Lock },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              section === id
                ? "bg-white text-slate-900 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {section === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <form
              onSubmit={handleSaveProfile}
              className="lg:col-span-2 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-8"
            >
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <Languages className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                      {t("common:languagePreference")}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {t("common:languagePreferenceHint")}
                    </p>
                    <div className="mt-4 max-w-md">
                      <LanguageSelect
                        id="profile-preferred-locale"
                        value={preferredLocale}
                        label={t("common:yourLanguage")}
                        hint={t("common:languageHint")}
                        applyImmediately={false}
                        onChange={(locale) => void persistPreferredLocale(locale)}
                      />
                    </div>
                    {school?.slug ? (
                      <p className="mt-4 text-sm text-slate-500">
                        <Link
                          to={`/${school.slug}/guide`}
                          className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {t("common:platformGuide")}
                        </Link>
                        {" — "}
                        {t("guide.dashboardBannerBody", { ns: "pages" })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{p("personalDetails")}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {p("personalDetailsHint")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {p("fullName")}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      name="name"
                      value={profileData.name}
                      onChange={handleInputChange}
                      required
                      className={fieldClass}
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      required
                      className={fieldClass}
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      className={fieldClass}
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {p("dob")}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      name="dob"
                      value={profileData.dob}
                      onChange={handleInputChange}
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Gender
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      name="gender"
                      value={profileData.gender}
                      onChange={handleInputChange}
                      className={`${fieldClass} appearance-none cursor-pointer`}
                    >
                      <option value="">{p("genderPreferNot")}</option>
                      <option value="Male">{p("genderMale")}</option>
                      <option value="Female">{p("genderFemale")}</option>
                      <option value="Other">{p("genderOther")}</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Role
                  </label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      disabled
                      value={formatRole(profileData.role)}
                      className={`${fieldClass} bg-slate-100 text-slate-400 cursor-not-allowed`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <textarea
                      name="address"
                      value={profileData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className={`${fieldClass} resize-none pt-3`}
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold transition-colors"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? t("common:loading") : t("common:saveChanges")}
                </button>
              </div>
            </form>

            <div className="space-y-6">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{p("photoSection")}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {p("photoHint")}
                </p>
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-sm font-bold text-slate-600 transition-colors"
                >
                  <ImagePlus className="w-4 h-4 text-indigo-600" />
                  {p("uploadPhoto")}
                </button>
                {profileData.photoUrl && (
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => void persistPhoto(null)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-100 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {p("removePhoto")}
                  </button>
                )}
              </div>
            </div>

            {canManageOfficialSignature(profileData.role || user?.role) && (
              <div className="lg:col-span-3">
                <SignaturePadCard
                  signatureUrl={profileData.signatureUrl || null}
                  busy={signatureBusy}
                  onSave={persistSignature}
                  onError={(msg) => showToast(msg, "error")}
                />
              </div>
            )}
          </motion.div>
        )}

        {section === "security" && user?.id && (
          <SecurityTab
            userId={user.id}
            securityPolicyRaw={school?.securityPolicy}
            saving={saving}
            onSubmit={handleResetPassword}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
