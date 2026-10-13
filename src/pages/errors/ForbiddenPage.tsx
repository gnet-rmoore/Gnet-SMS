import { ShieldOff, Lock, Info } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "../../components/errors/ErrorPageShell";
import { useErrorHomePath } from "../../lib/errorHomePath";
import { useAuthStore } from "../../store/authStore";

type Props = {
  embedded?: boolean;
  reason?: string;
};

/** 403 — signed-in user lacks role or capability for a route. */
export default function ForbiddenPage({ embedded = false, reason: reasonProp }: Props) {
  const { t } = useTranslation(["public", "common"]);
  const [params] = useSearchParams();
  const home = useErrorHomePath();
  const accessToken = useAuthStore((s) => s.accessToken);
  const reason = (reasonProp || params.get("reason") || "generic").toLowerCase();
  const copyKey =
    reason === "role" || reason === "capability" || reason === "plan" ? reason : "generic";

  return (
    <ErrorPageShell
      langId="error-403-lang"
      tone="rose"
      icon={ShieldOff}
      code="403"
      eyebrow={t("public:errorPages.forbidden.eyebrow")}
      title={t(`public:errorPages.forbidden.${copyKey}.title`)}
      body={t(`public:errorPages.forbidden.${copyKey}.body`)}
      hints={[
        { icon: Lock, text: t("public:errorPages.forbidden.hintLock") },
        { icon: Info, text: t("public:errorPages.forbidden.hintAsk") },
      ]}
      secondary={
        accessToken
          ? {
              label: t("public:errorPages.goBack"),
              onClick: () => {
                if (window.history.length > 1) window.history.back();
                else window.location.assign(home);
              },
            }
          : { to: "/", label: t("public:errorPages.goHome") }
      }
      primary={
        accessToken
          ? { to: home, label: t("public:errorPages.goHome") }
          : { to: "/login", label: t("public:errorPages.signIn") }
      }
      footerNote={t("public:errorPages.footerNote")}
      embedded={embedded}
    />
  );
}
