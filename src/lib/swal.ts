import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import i18n from "../i18n/instance";

/** Shared Executive Slate chrome for SweetAlert2. */
const slateClasses = {
  container: "sms-swal-container",
  popup: "sms-swal-popup",
  title: "sms-swal-title",
  htmlContainer: "sms-swal-html",
  actions: "sms-swal-actions",
  confirmButton: "sms-swal-btn sms-swal-btn-confirm",
  cancelButton: "sms-swal-btn sms-swal-btn-cancel",
  denyButton: "sms-swal-btn sms-swal-btn-danger",
  icon: "sms-swal-icon",
  image: "sms-swal-image",
  closeButton: "sms-swal-close",
  timerProgressBar: "sms-swal-timer",
};

const motionClasses = {
  showClass: {
    popup: "sms-swal-animate-in",
    backdrop: "sms-swal-backdrop-in",
    icon: "sms-swal-icon-in",
  },
  hideClass: {
    popup: "sms-swal-animate-out",
    backdrop: "sms-swal-backdrop-out",
    icon: "sms-swal-icon-out",
  },
};

export const showSwal = Swal.mixin({
  ...motionClasses,
  customClass: slateClasses,
  buttonsStyling: false,
  backdrop: "rgba(15, 23, 42, 0.4)",
  heightAuto: false,
  padding: "2rem",
  width: "28rem",
});

export const toast = showSwal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  width: "auto",
  padding: "1rem 1.25rem",
  backdrop: false,
  customClass: {
    ...slateClasses,
    popup: "sms-swal-toast",
    title: "sms-swal-toast-title",
  },
  showClass: {
    popup: "sms-swal-toast-in",
  },
  hideClass: {
    popup: "sms-swal-toast-out",
  },
  didOpen: (toastEl) => {
    toastEl.addEventListener("mouseenter", Swal.stopTimer);
    toastEl.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export const alertSuccess = (title: string, text?: string) =>
  showSwal.fire({ title, text, icon: "success" });

export const alertError = (title: string, text?: string) =>
  showSwal.fire({ title, text, icon: "error" });

export const alertWarning = (title: string, text?: string) =>
  showSwal.fire({ title, text, icon: "warning" });

export const alertInfo = (title: string, text?: string) =>
  showSwal.fire({ title, text, icon: "info" });

export type ConfirmActionOptions = {
  title: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  /** Rose confirm button + warning icon (deletes / destructive). */
  danger?: boolean;
  icon?: "question" | "warning" | "info";
};

/** Primary confirm helper — returns true if the user confirmed. */
export async function confirmAction(opts: ConfirmActionOptions): Promise<boolean> {
  const danger = Boolean(opts.danger);
  const result = await showSwal.fire({
    title: opts.title,
    text: opts.html ? undefined : opts.text,
    html: opts.html,
    icon: opts.icon || (danger ? "warning" : "question"),
    showCancelButton: true,
    confirmButtonText:
      opts.confirmText ||
      (danger
        ? i18n.t("confirmDelete", { ns: "common", defaultValue: "Yes, delete" })
        : i18n.t("confirmProceed", { ns: "common", defaultValue: "Yes, proceed" })),
    cancelButtonText: opts.cancelText || i18n.t("cancel", { ns: "common", defaultValue: "Cancel" }),
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      ...slateClasses,
      confirmButton: danger
        ? "sms-swal-btn sms-swal-btn-danger"
        : "sms-swal-btn sms-swal-btn-confirm",
      popup: danger ? "sms-swal-popup sms-swal-popup-danger" : "sms-swal-popup",
    },
  });
  return result.isConfirmed;
}

/** @deprecated Prefer confirmAction — kept for existing call sites. */
export const alertConfirm = (
  title: string,
  text: string,
  confirmText?: string
) =>
  showSwal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText:
      confirmText ||
      i18n.t("confirmProceed", { ns: "common", defaultValue: "Yes, proceed" }),
    cancelButtonText: i18n.t("cancel", { ns: "common", defaultValue: "Cancel" }),
    reverseButtons: true,
    focusCancel: true,
  });

/** @deprecated Prefer confirmAction({ danger: true }) — kept for existing call sites. */
export const alertDeleteConfirm = (
  title: string,
  text?: string,
  confirmText?: string
) =>
  showSwal.fire({
    title,
    text:
      text ||
      i18n.t("cannotUndo", { ns: "common", defaultValue: "This action cannot be undone." }),
    icon: "warning",
    showCancelButton: true,
    confirmButtonText:
      confirmText ||
      i18n.t("yesDeleteIt", { ns: "common", defaultValue: "Yes, delete it" }),
    cancelButtonText: i18n.t("cancel", { ns: "common", defaultValue: "Cancel" }),
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      ...slateClasses,
      confirmButton: "sms-swal-btn sms-swal-btn-danger",
      popup: "sms-swal-popup sms-swal-popup-danger",
    },
  });
