import React from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Ban, Mail, ShieldAlert } from "lucide-react";
import { ErrorPageShell } from "../components/errors/ErrorPageShell";
import {
  clearSchoolUnavailable,
  readSchoolUnavailable,
} from "../lib/schoolUnavailable";
import { useAuthStore } from "../store/authStore";

function statusCopyKey(status: string): string {
  switch (status) {
    case "SUSPENDED":
      return "suspended";
    case "CLOSED":
      return "closed";
    case "REJECTED":
      return "rejected";
    case "PENDING_REVIEW":
      return "pendingReview";
    case "DRAFT":
      return "draft";
    case "TRIAL_EXPIRED":
      return "trialExpired";
    default:
      return "unavailable";
  }
}

/**
 * Public page shown when a school tenant cannot sign in
 * (Super Admin suspended / closed / not yet active).
 */
export default function SchoolUnavailablePage() {
  const { t } = useTranslation(["public", "common"]);
  const logout = useAuthStore((s) => s.logout);
  const [searchParams] = useSearchParams();

  const remembered = React.useMemo(() => readSchoolUnavailable(), []);
  const status = (
    searchParams.get("status") ||
    remembered?.schoolStatus ||
    "SUSPENDED"
  ).toUpperCase();
  const schoolName =
    searchParams.get("name") ||
    remembered?.schoolName ||
    t("public:schoolUnavailable.yourSchool");
  const copyKey = statusCopyKey(status);

  React.useEffect(() => {
    logout();
    return () => clearSchoolUnavailable();
  }, [logout]);

  return (
    <ErrorPageShell
      langId="school-unavailable-lang"
      tone="rose"
      icon={Ban}
      eyebrow={t("public:schoolUnavailable.eyebrow")}
      title={t(`public:schoolUnavailable.${copyKey}.title`)}
      body={t(`public:schoolUnavailable.${copyKey}.body`, { school: schoolName })}
      hints={[
        { icon: ShieldAlert, text: t("public:schoolUnavailable.whatItMeans") },
        { icon: Mail, text: t("public:schoolUnavailable.contactHint") },
      ]}
      secondary={{
        to: "/login",
        label: t("public:schoolUnavailable.backToLogin"),
      }}
      primary={{
        to: "/",
        label: t("public:schoolUnavailable.backHome"),
      }}
      footerNote={t("public:schoolUnavailable.footerNote")}
    />
  );
}
