import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Printer,
  Download,
  GraduationCap,
  User,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PageShell, PageHeader, Button, Surface, TextField } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import {
  assembleCertificateData,
  CertificateView,
  getCertificateTemplateDef,
  parseCertificateDefaults,
  resolveCertificateTemplateKey,
} from "../../features/certificates";
import {
  parseDocumentSignatories,
  resolveDocumentSignatory,
  resolveSignatoryByUserId,
  type StaffSignatureRef,
} from "../../lib/documentSignatories";

/**
 * Issue graduation / completion certificates for students.
 * Template + branding + signatory defaults come from school Settings.
 */
export default function CertificatesPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school, accessToken } = useAuthStore();
  const [students, setStudents] = React.useState<any[]>([]);
  const [staff, setStaff] = React.useState<StaffSignatureRef[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selected, setSelected] = React.useState<any | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const defaults = parseCertificateDefaults(school?.certificateDefaults);
  const docMap = parseDocumentSignatories(school?.documentSignatories);
  const [sig1Name, setSig1Name] = React.useState(defaults.sig1Name);
  const [sig1Title, setSig1Title] = React.useState(defaults.sig1Title);
  const [sig2Name, setSig2Name] = React.useState(defaults.sig2Name);
  const [sig2Title, setSig2Title] = React.useState(defaults.sig2Title);
  const [sig1UserId, setSig1UserId] = React.useState(defaults.sig1UserId);
  const [sig2UserId, setSig2UserId] = React.useState(defaults.sig2UserId);
  const [academicYear, setAcademicYear] = React.useState(
    `${new Date().getFullYear()} — ${new Date().getFullYear() + 1}`
  );
  const [issueDate, setIssueDate] = React.useState(
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  const templateId = resolveCertificateTemplateKey(school?.certificateTemplate);
  const templateDef = getCertificateTemplateDef(templateId);

  React.useEffect(() => {
    const d = parseCertificateDefaults(school?.certificateDefaults);
    const map = parseDocumentSignatories(school?.documentSignatories);
    setSig1Name(d.sig1Name);
    setSig1Title(d.sig1Title);
    setSig2Name(d.sig2Name);
    setSig2Title(d.sig2Title);
    setSig1UserId(d.sig1UserId || map.principal?.userId || "");
    setSig2UserId(d.sig2UserId || map.secondary?.userId || "");
  }, [school?.id, school?.certificateDefaults, school?.documentSignatories]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!school?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [stuRes, staffRes] = await Promise.all([
          fetch(`/api/schools/${school.id}/students`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`/api/schools/${school.id}/staff`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);
        if (stuRes.ok) {
          const data = await stuRes.json();
          if (!cancelled) setStudents(Array.isArray(data) ? data : []);
        }
        if (staffRes.ok) {
          const data = await staffRes.json();
          if (!cancelled) setStaff(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setStudents([]);
          setStaff([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [school?.id, accessToken]);

  const filtered = students.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      String(s.name || "").toLowerCase().includes(q) ||
      String(s.email || "").toLowerCase().includes(q)
    );
  });

  const sig1 = sig1UserId
    ? resolveSignatoryByUserId(sig1UserId, staff, {
        name: sig1Name,
        title: sig1Title,
      })
    : resolveDocumentSignatory("principal", docMap, staff, {
        name: sig1Name,
        title: sig1Title,
      });
  const sig2 = sig2UserId
    ? resolveSignatoryByUserId(sig2UserId, staff, {
        name: sig2Name,
        title: sig2Title,
      })
    : resolveDocumentSignatory("secondary", docMap, staff, {
        name: sig2Name,
        title: sig2Title,
      });

  const certData = selected
    ? assembleCertificateData({
        schoolName: school?.name || "",
        studentName: selected.name || "",
        academicYear,
        issueDate,
        logoUrl: school?.logoUrl,
        address: school?.address,
        brandColor: school?.brandColor,
        title:
          templateId === "CERT_HERITAGE_TAN"
            ? "HIGH SCHOOL\nGRADUATION DIPLOMA"
            : templateId === "CERT_RED_SEAL"
              ? "DIPLOMA"
              : "CERTIFICATE OF COMPLETION",
        leadIn:
          templateId === "CERT_RED_SEAL" || templateId === "CERT_HERITAGE_TAN"
            ? "This diploma is given to"
            : "THIS CERTIFIES THAT",
        body:
          templateId === "CERT_HERITAGE_TAN"
            ? `for having completed the required course of study in ${school?.name || "this school"}.`
            : templateId === "CERT_RED_SEAL"
              ? `for completing all requirements as prescribed by the Department of Education.`
              : `has completed the prescribed course of study at ${school?.name || "this school"}.`,
        signatories: [
          {
            name: sig1.name || sig1Name,
            title: sig1.title || sig1Title,
            signatureUrl: sig1.signatureUrl,
          },
          {
            name: sig2.name || sig2Name,
            title: sig2.title || sig2Title,
            signatureUrl: sig2.signatureUrl,
          },
        ],
      })
    : null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.querySelector(".cert-sheet") as HTMLElement | null;
    if (!element) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: "letter",
      });
      pdf.addImage(img, "PNG", 0, 0, 11, 8.5);
      const safeName = String(selected?.name || "student")
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 40);
      pdf.save(`certificate-${safeName}.pdf`);
    } catch (err) {
      console.error("Certificate PDF failed", err);
    } finally {
      setDownloading(false);
    }
  };

  const staffOptions = staff.filter((s) => s.id);

  return (
    <PageShell>
      <PageHeader
        title={t("pages:certificates.title")}
        subtitle={t("pages:certificates.subtitle", { template: templateDef.name })}
        actions={
          selected ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
                {t("common:print")}
              </Button>
              <Button
                type="button"
                onClick={() => void handleDownloadPDF()}
                disabled={downloading}
              >
                <Download className="w-4 h-4" />
                {downloading ? t("common:loading") : t("common:download")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Surface className="lg:col-span-4 p-6 space-y-4 print:hidden">
          <div className="flex items-center gap-2 text-slate-900">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-extrabold tracking-tight">
              {t("pages:certificates.pickStudent")}
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("pages:certificates.searchPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            />
          </div>
          <div className="max-h-[28rem] overflow-y-auto space-y-1 rounded-2xl border border-slate-100 bg-slate-50 p-2">
            {loading ? (
              <p className="p-4 text-sm text-slate-500">{t("common:loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">{t("pages:certificates.empty")}</p>
            ) : (
              filtered.map((s) => {
                const active = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-800 hover:bg-slate-100 border border-slate-100"
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        active ? "bg-white/15" : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold truncate">{s.name}</span>
                      <span
                        className={`block text-xs truncate ${
                          active ? "text-indigo-100" : "text-slate-500"
                        }`}
                      >
                        {s.email || s.classLabel || "—"}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {selected && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("pages:certificates.signatories")}
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-500">
                  {t("pages:certificates.sig1Staff")}
                </span>
                <select
                  value={sig1UserId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSig1UserId(id);
                    const u = staff.find((s) => s.id === id);
                    if (u?.name && !sig1Name.trim()) setSig1Name(u.name);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                >
                  <option value="">—</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.role ? ` (${s.role})` : ""}
                      {!s.signatureUrl
                        ? ` — ${t("pages:settings.documentSignaturesNoFile")}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label={t("pages:certificates.sig1Name")}
                value={sig1Name}
                onChange={(e) => setSig1Name(e.target.value)}
              />
              <TextField
                label={t("pages:certificates.sig1Title")}
                value={sig1Title}
                onChange={(e) => setSig1Title(e.target.value)}
              />
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-500">
                  {t("pages:certificates.sig2Staff")}
                </span>
                <select
                  value={sig2UserId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSig2UserId(id);
                    const u = staff.find((s) => s.id === id);
                    if (u?.name && !sig2Name.trim()) setSig2Name(u.name);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                >
                  <option value="">—</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.role ? ` (${s.role})` : ""}
                      {!s.signatureUrl
                        ? ` — ${t("pages:settings.documentSignaturesNoFile")}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label={t("pages:certificates.sig2Name")}
                value={sig2Name}
                onChange={(e) => setSig2Name(e.target.value)}
              />
              <TextField
                label={t("pages:certificates.sig2Title")}
                value={sig2Title}
                onChange={(e) => setSig2Title(e.target.value)}
              />
              <TextField
                label={t("pages:certificates.academicYear")}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
              <TextField
                label={t("pages:certificates.issueDate")}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
          )}
        </Surface>

        <div className="lg:col-span-8">
          {certData ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-x-auto"
            >
              <CertificateView templateId={templateId} data={certData} />
            </motion.div>
          ) : (
            <Surface className="p-12 text-center text-slate-500">
              {t("pages:certificates.pickHint")}
            </Surface>
          )}
        </div>
      </div>
    </PageShell>
  );
}
