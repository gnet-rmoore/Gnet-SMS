import { AlertTriangle, RefreshCw, Bug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "../../components/errors/ErrorPageShell";
import { useErrorHomePath } from "../../lib/errorHomePath";

type Props = {
  error?: Error | null;
  onRetry?: () => void;
  embedded?: boolean;
};

function isChunkLoadError(error?: Error | null): boolean {
  const msg = `${error?.name || ""} ${error?.message || ""}`;
  return /Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i.test(
    msg
  );
}

/** 500 — unexpected render / chunk-load failure. */
export default function ServerErrorPage({ error, onRetry, embedded = false }: Props) {
  const { t } = useTranslation(["public", "common"]);
  const home = useErrorHomePath();
  const chunk = isChunkLoadError(error);
  const copyKey = chunk ? "chunk" : "generic";

  return (
    <ErrorPageShell
      langId="error-500-lang"
      tone="amber"
      icon={AlertTriangle}
      code="500"
      eyebrow={t("public:errorPages.serverError.eyebrow")}
      title={t(`public:errorPages.serverError.${copyKey}.title`)}
      body={t(`public:errorPages.serverError.${copyKey}.body`)}
      hints={[
        { icon: Bug, text: t("public:errorPages.serverError.hint") },
        { icon: RefreshCw, text: t("public:errorPages.serverError.hintReload") },
      ]}
      secondary={{ to: home, label: t("public:errorPages.goHome") }}
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
