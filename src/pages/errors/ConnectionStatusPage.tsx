import React from "react";
import { Wifi, WifiOff, CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "../../components/errors/ErrorPageShell";
import { useErrorHomePath } from "../../lib/errorHomePath";

type Props = {
  onRetry?: () => void;
  embedded?: boolean;
};

const NETWORK_ERROR_PATTERN =
  /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected|err_network_changed|err_connection|err_name_not_resolved|err_address_unreachable|err_timed_out|loading chunk|chunkloaderror|dynamically imported module/i;

export function isNetworkFailure(error?: Error | null): boolean {
  const message = `${error?.name || ""} ${error?.message || ""}`;
  return NETWORK_ERROR_PATTERN.test(message);
}

/** Connection status page shown when a connectivity failure would otherwise reach the 500 page. */
export default function ConnectionStatusPage({ onRetry, embedded = false }: Props) {
  const { t } = useTranslation(["public", "common"]);
  const home = useErrorHomePath();
  const [online, setOnline] = React.useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  React.useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const retry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
  };

  if (!online) {
    return (
      <ErrorPageShell
        langId="error-connection-lang"
        tone="indigo"
        icon={WifiOff}
        code="OFFLINE"
        eyebrow={t("public:errorPages.connection.eyebrow")}
        title={t("public:errorPages.offline.title")}
        body={t("public:errorPages.offline.body")}
        hints={[
          { icon: CloudOff, text: t("public:errorPages.offline.hint") },
          { icon: RefreshCw, text: t("public:errorPages.offline.hintRetry") },
        ]}
        secondary={{ to: home, label: t("public:errorPages.goHome") }}
        primary={{ label: t("public:errorPages.tryAgain"), onClick: retry }}
        footerNote={t("public:errorPages.footerNote")}
        embedded={embedded}
      />
    );
  }

  return (
    <ErrorPageShell
      langId="error-connection-lang"
      tone="amber"
      icon={Wifi}
      code="ONLINE"
      eyebrow={t("public:errorPages.connection.eyebrow")}
      title={t("public:errorPages.connection.onlineTitle")}
      body={t("public:errorPages.connection.onlineBody")}
      hints={[
        { icon: CloudOff, text: t("public:errorPages.connection.onlineHint") },
        { icon: RefreshCw, text: t("public:errorPages.connection.onlineHintRetry") },
      ]}
      secondary={{ to: home, label: t("public:errorPages.goHome") }}
      primary={{ label: t("public:errorPages.tryAgain"), onClick: retry }}
      footerNote={t("public:errorPages.footerNote")}
      embedded={embedded}
    />
  );
}
