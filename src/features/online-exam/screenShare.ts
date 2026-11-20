/**
 * Browser screen-capture helpers for online exam kiosk.
 *
 * Important platform limits (enforced in UI/copy elsewhere):
 * - getDisplayMedia requires user activation/consent; we cannot guarantee a
 *   prompt-free picker in all browsers.
 * - We can only prefer the current exam tab/surface via hints and validate the
 *   acquired track; we cannot force an arbitrary window.
 * - The browser's "Stop sharing" indicator is browser-controlled and cannot be
 *   hidden or suppressed by web code. We detect end/loss and enforce policy.
 */

export type ExamStreamFailureReason =
  | "denied"
  | "unsupported"
  | "invalid-surface"
  | "no-track"
  | "error";

export type ExamStreamResult =
  | { ok: true; stream: MediaStream; displaySurface?: string }
  | { ok: false; reason: ExamStreamFailureReason; message?: string; displaySurface?: string };

function getDisplaySurface(stream: MediaStream): string | undefined {
  try {
    const track = stream.getVideoTracks()[0];
    const settings = (track?.getSettings?.() || {}) as any;
    return typeof settings.displaySurface === "string" ? settings.displaySurface : undefined;
  } catch {
    return undefined;
  }
}

export function isAllowedExamSurface(surface: string | undefined): boolean {
  // Prefer exam tab/browser window; reject monitor capture when identifiable.
  // If the browser does not report displaySurface, allow (cannot reliably reject).
  if (!surface) return true;
  if (surface === "monitor") return false;
  if (surface === "browser" || surface === "tab" || surface === "window") return true;
  return false;
}

export async function requestExamTabStream(): Promise<ExamStreamResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    return { ok: false, reason: "unsupported", message: "Screen sharing is not supported in this browser." };
  }

  const attempts: Array<MediaStreamConstraints | any> = [
    {
      video: {
        frameRate: { ideal: 10, max: 15 },
        cursor: "never",
      },
      audio: false,
      // Chromium hints to prefer/lock to the current exam tab where supported.
      preferCurrentTab: true as any,
      selfBrowserSurface: "include" as any,
      surfaceSwitching: "exclude" as any,
      monitorTypeSurfaces: "exclude" as any,
    },
    { video: true, audio: false },
  ];

  let lastErr: any = null;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      const track = stream.getVideoTracks()[0];
      if (!track) {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
        return { ok: false, reason: "no-track", message: "No video track was provided." };
      }
      const displaySurface = getDisplaySurface(stream);
      if (!isAllowedExamSurface(displaySurface)) {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
        return {
          ok: false,
          reason: "invalid-surface",
          displaySurface,
          message:
            "Please share this exam tab/window (not your entire screen or another monitor), then try again.",
        };
      }
      return { ok: true, stream, displaySurface };
    } catch (err: any) {
      lastErr = err;
      const name = String(err?.name || "");
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "AbortError") {
        return { ok: false, reason: "denied", message: err?.message || "Screen sharing was not granted." };
      }
      // try next constraint set on Overconstrained/Type/NotSupported issues
      if (name !== "OverconstrainedError" && name !== "TypeError" && name !== "NotSupportedError") {
        // other errors: fall through to try fallback once
      }
    }
  }
  return {
    ok: false,
    reason: "error",
    message: lastErr?.message || "Could not start screen sharing.",
  };
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((t) => t.stop());
  } catch {}
}

export function attachStreamToVideo(
  stream: MediaStream,
  existing?: HTMLVideoElement | null
): HTMLVideoElement {
  const el =
    existing ||
    (() => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      return v;
    })();
  try {
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      void el.play().catch(() => undefined);
    }
  } catch {}
  return el;
}

export function isStreamLive(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  const tracks = stream.getVideoTracks();
  if (!tracks.length) return false;
  return tracks.some((t) => t.readyState === "live");
}

export function examTabShareSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
}
