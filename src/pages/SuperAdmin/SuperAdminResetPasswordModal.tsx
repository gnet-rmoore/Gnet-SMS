import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, X, Copy, Check } from "lucide-react";
import { Button } from "../../components/ui";
import { toast } from "../../lib/swal";
import { useAuthStore } from "../../store/authStore";

export type ResetPasswordTarget = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Props = {
  user: ResetPasswordTarget | null;
  onClose: () => void;
  onDone?: () => void;
};

export function SuperAdminResetPasswordModal({ user, onClose, onDone }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [password, setPassword] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [mustChange, setMustChange] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setPassword("");
    setReason("");
    setMustChange(true);
    setRevealed(null);
    setCopied(false);
    setSaving(false);
  }, [user?.id]);

  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          password: password.trim() || undefined,
          mustChangePassword: mustChange,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await toast.fire({
          icon: "error",
          title: data.error || "Password reset failed",
        });
        return;
      }
      setRevealed(data.tempPassword || password);
      await toast.fire({ icon: "success", title: "Password reset" });
      onDone?.();
    } catch (err) {
      console.error(err);
      await toast.fire({ icon: "error", title: "Password reset failed" });
    } finally {
      setSaving(false);
    }
  };

  const copyPassword = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">Reset password</h2>
                <p className="text-sm text-slate-300 font-medium">{user.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {revealed ? (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                Copy this temporary password now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <code className="flex-1 font-mono text-sm text-slate-900 break-all">{revealed}</code>
                <Button variant="secondary" size="compact" onClick={copyPassword}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                {user.email} · {user.role.replace(/_/g, " ")}
                {mustChange ? " · must change on next login" : ""}
              </p>
              <Button className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                {user.email} · <span className="font-mono text-slate-700">{user.role}</span>
              </p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Temporary password (optional)
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Support ticket / caller name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={mustChange}
                  onChange={(e) => setMustChange(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Require password change on next login
              </label>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Resetting…" : "Reset password"}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
