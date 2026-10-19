import React from "react";
import {
  FileText,
  Download,
  Search,
  Filter,
  FolderOpen,
} from "lucide-react";
import { formatSafe } from "../utils/dateHelpers";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  DOCUMENT_CATEGORIES,
  categoryAccent,
  fileTypeAccent,
  formatCategory,
} from "../../documents/constants";

export type DocumentsTabProps = {
  documentCategory?: string;
  documentSearch?: string;
  filteredDocuments?: any[];
  setDocumentCategory?: (cat: string) => void;
  setDocumentSearch?: (q: string) => void;
  [key: string]: any;
};

/** Presentational extract — school documents browse for staff. */
export function DocumentsTab({
  documentCategory = "ALL",
  documentSearch = "",
  filteredDocuments = [],
  setDocumentCategory,
  setDocumentSearch,
}: DocumentsTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const categories = ["ALL", ...DOCUMENT_CATEGORIES];

  return (
    <motion.div
      key="documents"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t("staffPortal.documents.searchPlaceholder")}
              value={documentSearch}
              onChange={(e) => setDocumentSearch?.(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
              {t("staffPortal.documents.category")}
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setDocumentCategory?.(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  documentCategory === cat
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-100"
                }`}
              >
                {cat === "ALL" ? t("common:all") : formatCategory(cat)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map((doc) => {
          const isPdf = doc.fileType?.toLowerCase() === "pdf";
          return (
            <div
              key={doc.id}
              className="bg-white rounded-[32px] p-6 border border-slate-100 hover:border-indigo-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] transition-colors space-y-5 flex flex-col justify-between group"
              style={{ cursor: "pointer" }}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div
                    className={`p-3.5 rounded-2xl ${
                      isPdf
                        ? "bg-rose-50 text-rose-600"
                        : fileTypeAccent(doc.fileType)
                    }`}
                  >
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-mono">
                    {doc.fileType?.toUpperCase() || "DOC"}
                  </span>
                </div>

                <div>
                  <span
                    className={`inline-block text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${categoryAccent(doc.category)}`}
                  >
                    {formatCategory(doc.category || "OTHER")}
                  </span>
                  <h4 className="font-extrabold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors mt-1.5">
                    {doc.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-normal font-medium mt-1 line-clamp-2">
                    {doc.description || t("staffPortal.documents.noDescription")}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase font-mono">
                  {formatSafe(doc.createdAt, "MMM dd, yyyy")}
                </span>

                <a
                  href={doc.fileUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-extrabold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t("staffPortal.documents.open")}</span>
                </a>
              </div>
            </div>
          );
        })}

        {filteredDocuments.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-[32px] border border-dashed border-slate-200 px-6">
            <FolderOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">
              {t("staffPortal.documents.empty")}
            </p>
            <p className="text-xs text-slate-400 mt-1">{t("staffPortal.documents.noFilesHint")}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
