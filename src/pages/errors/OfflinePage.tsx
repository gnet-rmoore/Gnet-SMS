import { WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "../../components/errors/ErrorPageShell";

type Props = {
  onRetry?: () => void;
  embedded?: boolean;
};

/** Shown when the browser reports offline (navigator.onLine === false). */
export default function OfflinePage({ onRetry, embedded = false }: Props) {
  const { t } = useTranslation(["public", "common"]);

  return (
    <ErrorPageShell
      langId="error-offline-lang"
      tone="indigo"
      icon={WifiOff}
      eyebrow={t("public:errorPages.offline.eyebrow")}
      title={t("public:errorPages.offline.title")}
      body={t("public:errorPages.offline.body")}
      hints={[
        { icon: CloudOff, text: t("public:errorPages.offline.hint") },
        { icon: RefreshCw, text: t("public:errorPages.offline.hintRetry") },
      ]}
      primary={{
        label: t("public:errorPages.tryAgain"),
        onClick: () => {
          if (onRetry) {
            onRetry();
            return;
          }
          window.location.reload();
        },
      }}
      footerNote={t("public:errorPages.footerNote")}
      embedded={embedded}
    />
  );
}
