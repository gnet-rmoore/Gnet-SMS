/**
 * Bridge between the guide overlay and the app shell.
 * The shell registers a revealer that can expand/scroll the sidebar before the
 * guide measures an anchor. When no shell is registered (public routes), we
 * fall back to scrolling the anchor directly.
 */

type GuideAnchorRevealer = (anchorId: string) => Promise<HTMLElement | null>;

let activeRevealer: GuideAnchorRevealer | null = null;

export function registerGuideAnchorRevealer(revealer: GuideAnchorRevealer): () => void {
  activeRevealer = revealer;
  return () => {
    if (activeRevealer === revealer) activeRevealer = null;
  };
}

export function findGuideAnchor(anchorId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-guide-id="${anchorId}"]`);
}

/** Resolve as soon as the anchor is mounted, or with null after the timeout. */
export function waitForGuideAnchor(
  anchorId: string,
  timeoutMs = 1600
): Promise<HTMLElement | null> {
  const existing = findGuideAnchor(anchorId);
  if (existing) return Promise.resolve(existing);
  if (typeof MutationObserver === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    let done = false;
    let observer: MutationObserver | null = null;
    let timer = 0;

    const finish = (el: HTMLElement | null) => {
      if (done) return;
      done = true;
      observer?.disconnect();
      window.clearTimeout(timer);
      resolve(el);
    };

    observer = new MutationObserver(() => {
      const el = findGuideAnchor(anchorId);
      if (el) finish(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    timer = window.setTimeout(() => finish(findGuideAnchor(anchorId)), timeoutMs);
  });
}

export function scrollGuideAnchorIntoView(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  el.scrollIntoView({ block: "center", inline: "nearest" });
  return el;
}

export async function revealGuideAnchor(anchorId: string): Promise<HTMLElement | null> {
  if (activeRevealer) return activeRevealer(anchorId);
  const el = await waitForGuideAnchor(anchorId);
  return scrollGuideAnchorIntoView(el);
}
