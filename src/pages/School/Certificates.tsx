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
import { PageShell, PageHeader, Button, Surface, TextField } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import {
  assembleCertificateData,
  CertificateView,
  exportCertificatesPdf,
  getCertificateTemplateDef,
  parseCertificateDefaults,
  parseCertificateRoster,
  printCertificates,
  resolveCertificateTemplateKey,
  type CertificateData,
} from "../../features/certificates";
import {
  parseDocumentSignatories,
  resolveDocumentSignatory,
  resolveSignatoryByUserId,
  type StaffSignatureRef,
} from "../../lib/documentSignatories";

type GeneratedCertificate = {
  id: string;
  studentId: string;
  studentName: string;
  serial: string;
  data: CertificateData;
};

export default function CertificatesPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { school, accessToken } = useAuthStore();
  const [students, setStudents] = React.useState<any[]>([]);
  const [staff, setStaff] = React.useState<StaffSignatureRef[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [generated, setGenerated] = React.useState<GeneratedCertificate[]>([]);
  const [downloading, setDownloading] = React.useState(false);
  const certificateRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const defaults = React.useMemo(
    () => parseCertificateDefaults(school?.certificateDefaults),
    [school?.certificateDefaults]
  );
  const roster = React.useMemo(
    () => parseCertificateRoster(defaults.certificateRoster),
    [defaults.certificateRoster]
  );
  const templateId = resolveCertificateTemplateKey(school?.certificateTemplate);
  const templateDef = getCertificateTemplateDef(templateId);

  const [sig1Name, setSig1Name] = React.useState(defaults.sig1Name);
  const [sig1Title, setSig1Title] = React.useState(defaults.sig1Title);
  const [sig2Name, setSig2Name] = React.useState(defaults.sig2Name);
  const [sig2Title, setSig2Title] = React.useState(defaults.sig2Title);
  const [sig1UserId, setSig1UserId] = React.useState(defaults.sig1UserId);
  const [sig2UserId, setSig2UserId] = React.useState(defaults.sig2UserId);
  const [academicYear, setAcademicYear] = React.useState(defaults.academicYearDefault);
  const [issueDate, setIssueDate] = React.useState(defaults.issueDateDefault);
  const [title, setTitle] = React.useState(defaults.title);
  const [leadIn, setLeadIn] = React.useState(defaults.leadIn);
  const [body, setBody] = React.useState(defaults.body);

  React.useEffect(() => {
    const d = parseCertificateDefaults(school?.certificateDefaults);
    const map = parseDocumentSignatories(school?.documentSignatories);
    setSig1Name(d.sig1Name);
    setSig1Title(d.sig1Title);
    setSig2Name(d.sig2Name);
    setSig2Title(d.sig2Title);
    setSig1UserId(d.sig1UserId || map.principal?.userId || "");
    setSig2UserId(d.sig2UserId || map.secondary?.userId || "");
    setAcademicYear(d.academicYearDefault);
    setIssueDate(d.issueDateDefault);
    setTitle(d.title);
    setLeadIn(d.leadIn);
    setBody(d.body);
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

  const docMap = React.useMemo(
    () => parseDocumentSignatories(school?.documentSignatories),
    [school?.documentSignatories]
  );
  const sig1 = sig1UserId
    ? resolveSignatoryByUserId(sig1UserId, staff, { name: sig1Name, title: sig1Title })
    : resolveDocumentSignatory("principal", docMap, staff, {
        name: sig1Name,
        title: sig1Title,
      });
  const sig2 = sig2UserId
    ? resolveSignatoryByUserId(sig2UserId, staff, { name: sig2Name, title: sig2Title })
    : resolveDocumentSignatory("secondary", docMap, staff, {
        name: sig2Name,
        title: sig2Title,
      });

  const eligible = React.useMemo(() => {
    if (!roster.enabled) return students;
    const ids = new Set(roster.studentIds);
    return students.filter((student) => ids.has(student.id));
  }, [students, roster]);

  const filtered = eligible.filter((student) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      String(student.name || "").toLowerCase().includes(q) ||
      String(student.email || "").toLowerCase().includes(q)
    );
  });

  const toggleSelected = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const makeCertificateData = (student: any, serial: string) =>
    assembleCertificateData({
      schoolName: school?.name || "",
      studentName: student.name || "",
      academicYear,
      issueDate,
      logoUrl: school?.logoUrl,
      address: school?.address,
      brandColor: school?.brandColor,
      title,
      leadIn,
      body,
      certificateId: serial,
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
    });

  const handleGenerateSelected = () => {
    const selected = eligible.filter((student) => selectedIds.has(student.id));
    if (!selected.length) return;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = (defaults.certificateIdPrefix || "CERT").trim() || "CERT";
    const next = selected.map((student, index) => {
      const serial = `${prefix}-${stamp}-${String(index + 1).padStart(3, "0")}`;
      const id = `${student.id}-${serial}`;
      return {
        id,
        studentId: student.id,
        studentName: student.name || "Student",
        serial,
        data: makeCertificateData(student, serial),
      };
    });
    const selectedStudentIds = new Set(selected.map((student) => student.id));
    setGenerated((prev) => [
      ...prev.filter((item) => !selectedStudentIds.has(item.studentId)),
      ...next,
    ]);
  };

  const elementsFor = (ids?: string[]) =>
    (ids
      ? generated.filter((item) => ids.includes(item.id))
      : generated
    )
      .map((item) => certificateRefs.current[item.id])
      .filter((element): element is HTMLDivElement => Boolean(element));

  const handlePrint = (ids?: string[]) => {
    printCertificates(elementsFor(ids));
  };

  const handleDownloadPdf = async (ids?: string[]) => {
    const elements = elementsFor(ids);
    if (!elements.length) return;
    setDownloading(true);
    try {
      const name =
        ids && ids.length === 1
          ? generated.find((item) => item.id === ids[0])?.studentName || "student"
          : "certificates";
      const safeName = String(name)
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 40);
      await exportCertificatesPdf(elements, `certificate-${safeName}.pdf`);
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
          generated.length ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handlePrint()}
              >
                <Printer className="w-4 h-4" />
                {t("pages:certificates.printAll")}
              </Button>
              <Button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={downloading}
              >
                <Download className="w-4 h-4" />
                {downloading
                  ? t("common:loading")
                  : t("pages:certificates.downloadAll")}
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
          {roster.enabled && (
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              {t("pages:certificates.rosterOnly")}
            </p>
          )}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("pages:certificates.searchPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-3 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">
              {t("pages:certificates.selectedCount", { count: selectedIds.size })}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(eligible.map((s) => s.id)))}
                className="text-indigo-600"
              >
                {t("pages:certificates.selectAll")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-500"
              >
                {t("pages:certificates.clearSelection")}
              </button>
            </div>
          </div>
          <div className="max-h-[22rem] overflow-y-auto space-y-1 rounded-2xl border border-slate-100 bg-slate-50 p-2">
            {loading ? (
              <p className="p-4 text-sm text-slate-500">{t("common:loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                {roster.enabled
                  ? t("pages:certificates.rosterEmpty")
                  : t("pages:certificates.empty")}
              </p>
            ) : (
              filtered.map((s) => {
                const active = selectedIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSelected(s.id)}
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
          <Button
            type="button"
            onClick={handleGenerateSelected}
            disabled={!selectedIds.size}
            className="w-full"
          >
            {t("pages:certificates.generateSelected")}
          </Button>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("pages:certificates.overridesTitle")}
            </p>
            <TextField
              label={t("pages:certificates.titleField")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label={t("pages:certificates.leadIn")}
              value={leadIn}
              onChange={(e) => setLeadIn(e.target.value)}
            />
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-500">
                {t("pages:certificates.body")}
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <TextField
              label={t("pages:certificates.serial")}
              value={defaults.certificateIdPrefix}
              readOnly
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

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("pages:certificates.signatories")}
            </p>
            {(["sig1", "sig2"] as const).map((slot) => {
              const userId = slot === "sig1" ? sig1UserId : sig2UserId;
              const name = slot === "sig1" ? sig1Name : sig2Name;
              const roleTitle = slot === "sig1" ? sig1Title : sig2Title;
              const setUserId = slot === "sig1" ? setSig1UserId : setSig2UserId;
              const setName = slot === "sig1" ? setSig1Name : setSig2Name;
              const setRoleTitle = slot === "sig1" ? setSig1Title : setSig2Title;
              return (
                <div key={slot} className="space-y-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-slate-500">
                      {t(`pages:certificates.${slot}Staff`)}
                    </span>
                    <select
                      value={userId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setUserId(id);
                        setName(staff.find((s) => s.id === id)?.name || "");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
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
                    label={t(`pages:certificates.${slot}Name`)}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <TextField
                    label={t(`pages:certificates.${slot}Title`)}
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </Surface>

        <div className="lg:col-span-8 space-y-6">
          {generated.length === 0 ? (
            <Surface className="p-12 text-center text-slate-500">
              {t("pages:certificates.noGenerated")}
            </Surface>
          ) : (
            generated.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {item.studentName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("pages:certificates.certificateId")}: {item.serial}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handlePrint([item.id])}
                    >
                      <Printer className="w-4 h-4" />
                      {t("pages:certificates.printCertificate")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleDownloadPdf([item.id])}
                      disabled={downloading}
                    >
                      <Download className="w-4 h-4" />
                      {t("pages:certificates.downloadPdf")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setGenerated((prev) => prev.filter((g) => g.id !== item.id))
                      }
                    >
                      {t("pages:certificates.remove")}
                    </Button>
                  </div>
                </div>
                <div
                  ref={(element) => {
                    certificateRefs.current[item.id] = element;
                  }}
                  data-certificate-item={index}
                  className="overflow-x-auto rounded-2xl bg-slate-100 p-3 print:p-0"
                >
                  <CertificateView templateId={templateId} data={item.data} />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
