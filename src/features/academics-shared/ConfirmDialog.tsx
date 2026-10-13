import { useEffect, useRef } from "react";
import { confirmAction } from "../../lib/swal";

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
} | null;

type Props = {
  confirm: ConfirmState;
  onClose: () => void;
};

/**
 * Bridges legacy ConfirmState into SweetAlert2.
 * Prefer calling `confirmAction` from `src/lib/swal` directly in new code.
 */
export function ConfirmDialog({ confirm, onClose }: Props) {
  const busy = useRef(false);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!confirm) {
      lastKey.current = null;
      return;
    }

    const key = `${confirm.title}|${confirm.message}|${confirm.confirmLabel || ""}`;
    if (lastKey.current === key || busy.current) return;
    lastKey.current = key;

    let cancelled = false;
    (async () => {
      busy.current = true;
      try {
        const ok = await confirmAction({
          title: confirm.title,
          text: confirm.message,
          confirmText: confirm.confirmLabel,
          danger: confirm.danger,
        });
        if (cancelled) return;
        if (ok) {
          await confirm.onConfirm();
        }
        onClose();
      } finally {
        busy.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [confirm, onClose]);

  return null;
}
