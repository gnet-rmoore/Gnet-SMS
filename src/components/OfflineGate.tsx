import React from "react";
import OfflinePage from "../pages/errors/OfflinePage";

type Props = {
  children: React.ReactNode;
};

/**
 * When the browser goes offline, replace the tree with the branded Offline page.
 * Restores children automatically when connectivity returns.
 */
export function OfflineGate({ children }: Props) {
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

  if (!online) {
    return (
      <OfflinePage
        onRetry={() => {
          if (navigator.onLine) setOnline(true);
          else window.location.reload();
        }}
      />
    );
  }

  return <>{children}</>;
}
