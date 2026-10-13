import React from "react";
import { Shield, Smartphone, Copy, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../lib/swal";

type MfaStatus = { enrolled: boolean; methods: string[]; phoneE164?: string | null };

export function MfaProfilePanel() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [status, setStatus] = React.useState<MfaStatus>({ enrolled: false, methods: [] });
  const [loading, setLoading] = React.useState(true);
  const [enrolling, setEnrolling] = React.useState(false);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [confirmCode, setConfirmCode] = React.useState("");
  const [disablePassword, setDisablePassword] = React.useState("");
  const [smsPhone, setSmsPhone] = React.useState("");
  const [smsCode, setSmsCode] = React.useState("");
  const [smsPending, setSmsPending] = React.useState(false);

  const headers = React.useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const refreshStatus = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/status", { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          enrolled: Boolean(data.enrolled),
          methods: Array.isArray(data.methods) ? data.methods : [],
          phoneE164: data.phoneE164 || null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch("/api/auth/mfa/enroll/start", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enroll failed");
      setSecret(data.secret);
      setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
      await toast.fire({ icon: "info", title: "Scan the secret in your authenticator app" });
    } catch (err: unknown) {
      await toast.fire({
        icon: "error",
        title: err instanceof Error ? err.message : "Enroll failed",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const confirmEnroll = async () => {
    try {
      const res = await fetch("/api/auth/mfa/enroll/confirm", {
        method: "POST",
        headers,
        body: JSON.stringify({ code: confirmCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setSecret(null);
      setConfirmCode("");
      setBackupCodes([]);
      await refreshStatus();
      await toast.fire({ icon: "success", title: "Two-factor authentication enabled" });
    } catch (err: unknown) {
      await toast.fire({
        icon: "error",
        title: err instanceof Error ? err.message : "Confirm failed",
      });
    }
  };

  const disableMfa = async () => {
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disable failed");
      setDisablePassword("");
      await refreshStatus();
      await toast.fire({ icon: "success", title: "Two-factor authentication disabled" });
    } catch (err: unknown) {
      await toast.fire({
        icon: "error",
        title: err instanceof Error ? err.message : "Disable failed",
      });
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading MFA status…</p>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-indigo-600" />
        <p className="text-sm font-bold text-slate-900">Authenticator app (TOTP)</p>
      </div>
      {status.enrolled ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-700 font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" /> Enrolled ({status.methods.join(", ") || "MFA"})
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Current password to disable"
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm"
            />
            <button
              type="button"
              onClick={() => void disableMfa()}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold"
            >
              Disable MFA
            </button>
          </div>
        </div>
      ) : secret ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Add this secret to your authenticator app, then enter the 6-digit code to confirm.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-mono break-all">
              {secret}
            </code>
            <button
              type="button"
              aria-label="Copy secret"
              onClick={() => void navigator.clipboard.writeText(secret || "")}
              className="p-2 rounded-xl border border-slate-200 bg-white"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {backupCodes.length > 0 && (
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold">Save backup codes (one-time use):</p>
              <p className="font-mono">{backupCodes.join(" · ")}</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              placeholder="6-digit code"
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => void confirmEnroll()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={enrolling}
          onClick={() => void startEnroll()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
        >
          {enrolling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
          Set up authenticator
        </button>
      )}
      <p className="text-xs text-slate-500">SMS requires school Settings → Security → Allow SMS OTP.</p>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <p className="text-sm font-bold text-slate-800">SMS verification</p>
        {smsPending ? (
          <div className="flex gap-2">
            <input
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value)}
              placeholder="6-digit SMS code"
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/mfa/enroll/sms/confirm", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ code: smsCode }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Confirm failed");
                  setSmsPending(false);
                  setSmsCode("");
                  await refreshStatus();
                  await toast.fire({ icon: "success", title: "SMS MFA enabled" });
                } catch (err: unknown) {
                  await toast.fire({
                    icon: "error",
                    title: err instanceof Error ? err.message : "Confirm failed",
                  });
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Confirm SMS
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              placeholder="+15551234567"
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/mfa/enroll/sms/start", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ phoneE164: smsPhone }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "SMS enroll failed");
                  setSmsPending(true);
                  await toast.fire({ icon: "info", title: "Verification code sent" });
                } catch (err: unknown) {
                  await toast.fire({
                    icon: "error",
                    title: err instanceof Error ? err.message : "SMS enroll failed",
                  });
                }
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
            >
              Enroll SMS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
