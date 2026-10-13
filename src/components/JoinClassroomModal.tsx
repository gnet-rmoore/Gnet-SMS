import React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "../store/authStore";

interface JoinClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinClassroomModal = ({ isOpen, onClose, onSuccess }: JoinClassroomModalProps) => {
  const { t } = useTranslation(["pages", "common"]);
  const [classCode, setClassCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const accessToken = useAuthStore((state) => state.accessToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/classrooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ classCode }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
        setClassCode("");
      } else {
        setError(data.error || t("classroomModals.joinFailed"));
      }
    } catch (err) {
      console.error(err);
      setError(t("classroomModals.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 bg-indigo-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{t("classroomModals.joinTitle")}</h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-white/80 font-medium">{t("classroomModals.joinSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">
                  {t("classroomModals.classCode")}
                </label>
                <input
                  type="text"
                  required
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center text-2xl font-bold tracking-widest"
                  placeholder="ABC123X"
                />
                {error && <p className="text-rose-500 text-xs font-bold mt-1 ml-1">{error}</p>}
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  {t("common:cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || !classCode.trim()}
                  className="flex-[2] px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-70"
                >
                  {loading ? t("classroomModals.joining") : t("classroomModals.joinClass")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
