import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "../store/authStore";

interface CreateClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateClassroomModal = ({ isOpen, onClose, onSuccess }: CreateClassroomModalProps) => {
  const { t } = useTranslation(["pages", "common"]);
  const [name, setName] = React.useState("");
  const [bannerColor, setBannerColor] = React.useState("bg-indigo-600");
  const [loading, setLoading] = React.useState(false);
  const { accessToken, school } = useAuthStore();

  const colors = [
    "bg-indigo-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-blue-600",
    "bg-violet-600",
    "bg-slate-800",
    "bg-cyan-600",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/schools/${school.id}/classrooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, bannerColor }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setName("");
      }
    } catch (err) {
      console.error(err);
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
            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className={`p-8 ${bannerColor} text-white transition-colors duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{t("classroomModals.createTitle")}</h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-white/80 font-medium">{t("classroomModals.createSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">
                  {t("classroomModals.classroomName")}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder={t("classroomModals.namePlaceholder")}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 ml-1">
                  {t("classroomModals.themeColor")}
                </label>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBannerColor(color)}
                      className={`w-10 h-10 rounded-full ${color} border-4 transition-all ${
                        bannerColor === color ? "border-slate-900 scale-110" : "border-transparent hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
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
                  disabled={loading}
                  className={`flex-[2] px-6 py-3 ${bannerColor} text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-70`}
                >
                  {loading ? t("classroomModals.creating") : t("classroomModals.createClassroom")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
