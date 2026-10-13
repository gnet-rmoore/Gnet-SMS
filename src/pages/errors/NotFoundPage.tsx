import { FileQuestion, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorPageShell } from "../../components/errors/ErrorPageShell";
import { useErrorHomePath } from "../../lib/errorHomePath";

type Props = {
  embedded?: boolean;
};

/** 404 — unknown SPA route. */
export default function NotFoundPage({ embedded = false }: Props) {
  const { t } = useTranslation(["public", "common"]);
  const home = useErrorHomePath();

  return (
    <ErrorPageShell
      langId="error-404-lang"
      tone="slate"
      icon={FileQuestion}
      code="404"
      eyebrow={t("public:errorPages.notFound.eyebrow")}
      title={t("public:errorPages.notFound.title")}
      body={t("public:errorPages.notFound.body")}
      hints={[{ icon: Compass, text: t("public:errorPages.notFound.hint") }]}
      secondary={{
        label: t("public:errorPages.goBack"),
        onClick: () => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back();
          } else {
            window.location.assign(home);
          }
        },
      }}
      primary={{ to: home, label: t("public:errorPages.goHome") }}
      footerNote={t("public:errorPages.footerNote")}
      embedded={embedded}
    />
  );
}
