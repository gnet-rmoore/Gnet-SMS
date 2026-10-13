import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applyDocumentLocale } from "./index";

/** Keeps <html lang> / dir in sync with the active i18n language (RTL for Arabic). */
export function LocaleDocumentEffect() {
  const { i18n } = useTranslation();
  useEffect(() => {
    applyDocumentLocale(i18n.language);
  }, [i18n.language]);
  return null;
}
