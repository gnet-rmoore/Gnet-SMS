import React from "react";
import { Check, Copy, Eye, KeyRound } from "lucide-react";
import { FeatureModalShell } from "../features/academics-shared/FeatureModalShell";
import { Button } from "./ui";
import { api } from "../services/api";
import { roleAccessApi } from "../features/role-access/api";
import { useAuthStore } from "../store/authStore";

type RevealTarget = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type RevealResult = {
  temporaryPassword?: string | null;
  issuedAt?: string | null;
  mustChangePassword?: boolean | null;
};

export function TemporaryPasswordRevealModal({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: RevealTarget | null;
  onClose: () => void;
}) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [busy, setBusy] = React.useState(false);
  const [revealed, setRevealed] = React.useState<RevealResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setRevealed(null);
    setError(null);
    setCopied(false);
  }, [target?.id, open]);

  const refreshSession = React.useCallback(async () => {
    try {
      const session = await roleAccessApi.refreshSession();
      setAuth(
        {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          photoUrl: session.user.photoUrl ?? null,
          mustChangePassword: Boolean(session.user.mustChangePassword),
          authMethod: session.user.authMethod ?? null,
        },
        session.accessToken,
        session.school as any,
        session.capabilities,
        session.entitlements ?? null,
        session.quotas ?? null
      );
      return true;
    } catch {
      return false;
    }
  }, [setAuth]);

  const reveal = React.useCallback(async () => {
    if (!target?.id) return;
    setBusy(true);
    setError(null);
    try {
      let result: RevealResult | null = null;
      try {
        result = await api.post(`/api/users/${target.id}/temporary-password/reveal`);
      } catch (err: any) {
        if (err?.status !== 403 || !(await refreshSession())) throw err;
        result = await api.post(`/api/users/${target.id}/temporary-password/reveal`);
      }
      if (!result?.temporaryPassword) {
        setRevealed(null);
        setError("No active temporary password is available for this account.");
        return;
      }
      setRevealed(result);
      setCopied(false);
    } catch (err: any) {
      setRevealed(null);
      setError(err?.message || "Failed to reveal temporary password.");
    } finally {
      setBusy(false);
    }
  }, [target?.id, refreshSession]);

  const copy = React.useCallback(async () => {
    if (!revealed?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(revealed.temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard access was blocked. Copy the password manually.");
    }
  }, [revealed?.temporaryPassword]);

  if (!open || !target) return null;

  return (
    <FeatureModalShell
      eyebrow="Account security"
      title="Temporary password"
      subtitle={`${target.name || target.email || target.id}${target.role ? ` · ${target.role}` : ""}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {revealed?.temporaryPassword ? (
            <Button type="button" onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? "Copied" : "Copy password"}
            </Button>
          ) : (
            <Button type="button" onClick={() => void reveal()} disabled={busy}>
              <Eye className="h-4 w-4" aria-hidden />
              {busy ? "Revealing…" : "Reveal password"}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 p-6 sm:p-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">Handle this like a credential.</p>
              <p className="mt-1 text-xs text-amber-800">
                Reveals are audit-logged. The password is only available while the account still
                requires a password change.
              </p>
            </div>
          </div>
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

        {revealed?.temporaryPassword ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Password</p>
              <p className="mt-2 break-all rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm font-bold text-slate-900">
                {revealed.temporaryPassword}
              </p>
            </div>
            {revealed.issuedAt ? (
              <p className="text-xs text-slate-500">
                Issued {new Date(revealed.issuedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Reveal the one-time password that was generated for this account.
          </p>
        )}
      </div>
    </FeatureModalShell>
  );
}
