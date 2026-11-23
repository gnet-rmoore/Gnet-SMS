import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useDrawerA11y({
  open,
  panelRef,
  initialFocusRef,
  restoreTriggerRef,
  trapRef,
  onRequestClose,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreTriggerRef?: RefObject<HTMLElement | null>;
  trapRef?: RefObject<HTMLElement | null>;
  onRequestClose: () => void;
}) {
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const trapRefRef = useRef(trapRef);
  trapRefRef.current = trapRef;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      (initialFocusRef?.current || panelRef.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const scope = trapRefRef.current?.current || panelRef.current;
      if (!scope) return;
      const nodes = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      (restoreTriggerRef?.current || previouslyFocused)?.focus();
    };
    // Refs are read at event time; do not re-subscribe on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
