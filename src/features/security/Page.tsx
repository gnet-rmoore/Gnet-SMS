import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  Plus, 
  MoreVertical, 
  AlertTriangle, 
  UserCheck, 
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  TrendingUp,
  Activity,
  Calendar,
  AlertCircle,
  PhoneCall,
  ShieldCheck,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  Camera,
  Radio,
  Lock,
  Unlock,
  Bell,
  RefreshCw,
  Compass,
  AlertOctagon,
  MessageSquare,
  Send,
  Check,
  UserMinus,
  Sparkles,
  Volume2,
  VolumeX,
  Smartphone,
  CheckSquare
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { useSecurityQuery } from "./hooks/useSecurityQuery";
import { securityApi } from "./api";
import { SecurityLogModal } from "./components/SecurityLogModal";
import { VisitorPassModal } from "./components/VisitorPassModal";
import { PageShell, Surface, Button, ListFilterBar } from "../../components/ui";
import { useListFilters, type FilterFieldDef } from "../list-filters";
import { useTranslation } from "react-i18next";

export const Security = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { school, accessToken, user } = useAuthStore();
  const {
    logs,
    loading,
    invalidate: refetchSecurity,
  } = useSecurityQuery();

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ type: "VISITOR", description: "", location: "", severity: "LOW" });
  
  // Tabs: "COMMAND_HUB" or "LOGS_FEED"
  const [activeTab, setActiveTab] = useState<"COMMAND_HUB" | "LOGS_FEED">("COMMAND_HUB");

  // Advanced filters for logs
  const sh = (key: string, opts?: Record<string, unknown>) => t(`security.${key}`, opts);
  const logFilterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "type",
        label: sh("logs.allEventTypes"),
        type: "enum",
        primary: true,
        allLabel: sh("logs.allEventTypes"),
        options: [
          { value: "VISITOR", label: sh("logs.visitorEntries") },
          { value: "INCIDENT", label: sh("logs.incidentReports") },
          { value: "PATROL", label: sh("logs.patrolRecords") },
        ],
      },
      {
        key: "severity",
        label: sh("logs.allSeverity"),
        type: "enum",
        primary: true,
        allLabel: sh("logs.allSeverity"),
        options: [
          { value: "LOW", label: sh("logs.severityLow") },
          { value: "MEDIUM", label: sh("logs.severityMedium") },
          { value: "HIGH", label: sh("logs.severityHigh") },
          { value: "CRITICAL", label: sh("logs.severityCritical") },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );
  const logFilters = useListFilters({ fields: logFilterFields, syncUrl: true });
  const selectedType = logFilters.values.type || "ALL";
  const selectedSeverity = logFilters.values.severity || "ALL";

  // Command Hub Interactive States
  const [threatLevel, setThreatLevel] = useState<"GREEN" | "AMBER" | "RED">("GREEN");

  // Interactive visitor tracking
  const [activeVisitors, setActiveVisitors] = useState<
    Array<{
      id: string;
      name: string;
      purpose: string;
      host: string;
      badge: string;
      checkIn: string;
      gate: string;
    }>
  >([]);

  const [archivedVisitors, setArchivedVisitors] = useState<
    Array<{
      id: string;
      name: string;
      purpose: string;
      host: string;
      badge: string;
      checkIn: string;
      checkOut: string;
      gate: string;
    }>
  >([]);

  const [newVisitor, setNewVisitor] = useState({ name: "", purpose: "", host: "", badge: "", gate: "Main Reception" });
  const [showVisitorModal, setShowVisitorModal] = useState(false);

  // Patrol checklists — local session only until a real API exists (start empty).
  const [checkpoints, setCheckpoints] = useState<
    Array<{ id: number; name: string; status: string; time: string; officer: string }>
  >([]);

  const isVpa = user?.role === "VPA" || user?.role === "PRINCIPAL";
  const isSecurityOnly = user?.role === "SECURITY" || user?.role === "SCHOOL_ADMIN";

  const fetchData = () => { refetchSecurity(); };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSecurityOnly) {
      alert(t("security.toast.accessRestricted"));
      return;
    }
    setSubmitting(true);
    try {
      await securityApi.createSecurityLog(school!.id, formData);
      setShowModal(false);
      setFormData({ type: "VISITOR", description: "", location: "", severity: "LOW" });
      fetchData();
    } catch (error) {
      console.error("Failed to create security log:", error);
    } finally {
      setSubmitting(false);
    }
  };



  // Check out visitor
  const handleCheckoutVisitor = (visitorId: string) => {
    const visitor = activeVisitors.find(v => v.id === visitorId);
    if (!visitor) return;
    
    // Move to archived
    const nowTime = format(new Date(), "hh:mm a");
    setArchivedVisitors(prev => [
      {
        id: visitor.id,
        name: visitor.name,
        purpose: visitor.purpose,
        host: visitor.host,
        badge: visitor.badge,
        checkIn: visitor.checkIn,
        checkOut: nowTime,
        gate: visitor.gate
      },
      ...prev
    ]);

    // Remove from active
    setActiveVisitors(prev => prev.filter(v => v.id !== visitorId));
  };

  // Create gate pass
  const handleAddVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitor.name || !newVisitor.purpose || !newVisitor.host) return;

    const badgeCode = newVisitor.badge || `BADGE-${Math.floor(100 + Math.random() * 900)}`;
    const nowTime = format(new Date(), "hh:mm a");
    const createdVisitor = {
      id: `v-${Date.now()}`,
      name: newVisitor.name,
      purpose: newVisitor.purpose,
      host: newVisitor.host,
      badge: badgeCode,
      checkIn: nowTime,
      gate: newVisitor.gate
    };

    setActiveVisitors(prev => [createdVisitor, ...prev]);
    setShowVisitorModal(false);
    setNewVisitor({ name: "", purpose: "", host: "", badge: "", gate: "Main Reception" });
  };

  // Verify a pending checkpoint
  const handleVerifyCheckpoint = (id: number) => {
    const nowTime = format(new Date(), "hh:mm a");
    setCheckpoints(prev => prev.map(cp => {
      if (cp.id === id) {
        return { ...cp, status: "VERIFIED", time: nowTime };
      }
      return cp;
    }));


  };

  // Toggle Threat Lockdown Level
  const handleThreatChange = (level: "GREEN" | "AMBER" | "RED") => {
    setThreatLevel(level);
  };

  // Calculations for summary stats
  const totalLogs = logs.length;
  const visitorCount = logs.filter((l) => l.type === "VISITOR").length + activeVisitors.length + archivedVisitors.length;
  const incidentCount = logs.filter((l) => l.type === "INCIDENT").length;
  const criticalCount = logs.filter((l) => l.severity === "CRITICAL" || l.severity === "HIGH").length + (threatLevel === "RED" ? 1 : 0);

  const chartData = [
    { name: sh("chart.visitorLogins"), value: visitorCount || 42, color: "#10B981" },
    { name: sh("logs.incidentReports"), value: incidentCount || 4, color: "#EF4444" },
    { name: sh("chart.campusPatrols"), value: checkpoints.filter(c => c.status === "VERIFIED").length, color: "#6366F1" },
  ];



  // Filtering logic for historical logs tab
  const filteredLogs = logs.filter((log) => {
    const matchesType = selectedType === "ALL" || log.type === selectedType;
    const matchesSeverity = selectedSeverity === "ALL" || log.severity === selectedSeverity;
    const q = logFilters.committedQ.toLowerCase();
    const matchesSearch =
      !q ||
      log.description.toLowerCase().includes(q) ||
      (log.location && log.location.toLowerCase().includes(q)) ||
      (log.logger?.name && log.logger.name.toLowerCase().includes(q));
    return matchesType && matchesSeverity && matchesSearch;
  });

  return (
    <PageShell
      className={`min-h-screen pb-12 transition-all duration-700 ${
        threatLevel === "RED" ? "bg-red-950/20" : threatLevel === "AMBER" ? "bg-amber-950/10" : ""
      }`}
    >
      
      {/* LOCKDOWN ACTIVE CRITICAL OVERLAY BANNER */}
      {threatLevel === "RED" && (
        <div className="bg-red-600 text-white p-3.5 rounded-2xl flex items-center justify-between gap-4 animate-pulse border border-red-500 shadow-xl shadow-red-600/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white text-red-600 rounded-lg flex items-center justify-center animate-spin">
              <AlertOctagon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-sm font-black tracking-widest uppercase">{sh("lockdown.title")}</p>
              <p className="text-xs text-red-100 font-medium">{sh("lockdown.subtitle")}</p>
            </div>
          </div>
          <Button
            size="compact"
            onClick={() => handleThreatChange("GREEN")}
            className="bg-white text-red-600 hover:bg-red-50 uppercase tracking-wider"
          >
            {sh("lockdown.lift")}
          </Button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[32px] border border-slate-800 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -translate-y-6 translate-x-6 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 z-10">
          <span className="inline-block text-xs font-black tracking-widest uppercase bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
            {isVpa ? t("security.chrome.executiveConsole") : t("security.chrome.commandHub")}
          </span>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 font-dashboard">
            <Shield className="w-8 h-8 text-indigo-400 stroke-[2]" />
            {t("security.chrome.terminalTitle")}
          </h1>
          <p className="text-slate-300 text-sm font-medium">
            {t("security.chrome.terminalSubtitle")}
          </p>
        </div>

        {/* Threat Level Switcher directly in Header */}
        <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 z-10">
          <div className="text-xs font-bold text-slate-500 pl-2 pr-1 uppercase tracking-wider">
            {t("security.chrome.perimeterAlarm")}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleThreatChange("GREEN")}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                threatLevel === "GREEN" 
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" 
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {t("security.chrome.threatGreen")}
            </button>
            <button
              onClick={() => handleThreatChange("AMBER")}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                threatLevel === "AMBER" 
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30" 
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {t("security.chrome.threatAmber")}
            </button>
            <button
              onClick={() => handleThreatChange("RED")}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                threatLevel === "RED" 
                  ? "bg-red-600 text-white animate-pulse shadow-md shadow-red-600/30" 
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {t("security.chrome.threatRed")}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("COMMAND_HUB")}
          className={`pb-4 px-4 font-black text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "COMMAND_HUB" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4 stroke-[2.5]" />
          {sh("tabsUi.command")}
        </button>
        <button
          onClick={() => setActiveTab("LOGS_FEED")}
          className={`pb-4 px-4 font-black text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "LOGS_FEED" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          {sh("tabsUi.logs", { count: totalLogs })}
        </button>
      </div>

      {/* KPI Stats Panel - Dynamic based on active threats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Surface variant="nested" className="hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sh("stats.patrolLevel")}</p>
              <p className="text-3xl font-black text-slate-900">
                {threatLevel === "RED" ? sh("stats.patrolMaximal") : threatLevel === "AMBER" ? sh("stats.patrolHeightened") : sh("stats.patrolStandard")}
              </p>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                {sh("stats.sentriesReady")}
              </span>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] ${
              threatLevel === "RED" ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"
            }`}>
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        </Surface>

        <Surface variant="nested" className="hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sh("stats.pendingCheckpoints")}</p>
              <p className="text-3xl font-black text-slate-900">
                {checkpoints.filter(c => c.status === "PENDING").length}
              </p>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full inline-block">
                {sh("stats.succeededToday", { count: checkpoints.filter(c => c.status === "VERIFIED").length })}
              </span>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <Compass className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </Surface>

        <Surface variant="nested" className="hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sh("stats.checkedInVisitors")}</p>
              <p className="text-3xl font-black text-slate-900">{activeVisitors.length}</p>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                {sh("stats.registeredBadges")}
              </span>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </Surface>

        <Surface variant="nested" className="hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sh("stats.criticalAlarms")}</p>
              <p className={`text-3xl font-black ${criticalCount > 0 ? "text-red-600" : "text-slate-950"}`}>
                {criticalCount}
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
                threatLevel === "RED" ? "bg-red-100 text-red-600 animate-bounce" : "bg-slate-50 text-slate-600"
              }`}>
                {threatLevel === "RED" ? sh("stats.emergencyBroadcasts") : sh("stats.noHazardAlerts")}
              </span>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] ${
              threatLevel === "RED" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Surface>
      </div>

      {/* Tab Contents */}
      {activeTab === "COMMAND_HUB" && (
        <div className="space-y-8">
          
          {/* Gate Pass Terminal & Patrol Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Gate Pass & Visitor Registry (Col Span 2) */}
            <Surface variant="primary" className="lg:col-span-2 p-6 space-y-6">
              
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{sh("gate.title")}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{sh("gate.subtitle")}</p>
                </div>
                
                {isSecurityOnly && (
                  <Button
                    onClick={() => setShowVisitorModal(true)}
                    className="text-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    {sh("gate.registerVisitor")}
                  </Button>
                )}
              </div>

              {/* Active Visitors List */}
              <div className="space-y-4">
                <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg inline-block uppercase tracking-wider">
                  {sh("gate.activeGuests", { count: activeVisitors.length })}
                </div>

                {activeVisitors.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic font-medium bg-slate-50 rounded-2xl border border-slate-100">
                    {sh("gate.noActiveVisitors")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeVisitors.map((visitor) => (
                      <div key={visitor.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-start gap-3 hover:shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] transition-all">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">
                              {visitor.badge}
                            </span>
                            <span className="text-xs font-bold text-slate-500">{sh("gate.badgeIn", { time: visitor.checkIn })}</span>
                          </div>
                          
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-800 leading-tight">{visitor.name}</h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{sh("gate.purpose", { purpose: visitor.purpose })}</p>
                            <p className="text-xs text-indigo-600 font-bold mt-1">{sh("gate.hostContact", { host: visitor.host })}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {sh("gate.registeredAt", { gate: visitor.gate })}
                          </div>
                        </div>

                        {isSecurityOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={sh("gate.checkoutAria")}
                            onClick={() => handleCheckoutVisitor(visitor.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 shrink-0"
                            title={sh("gate.checkoutAria")}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recently Checked out History */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{sh("gate.departedGuests")}</h4>
                <div className="divide-y divide-slate-100">
                  {archivedVisitors.map((v) => (
                    <div key={v.id} className="py-2.5 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-slate-800">{v.name}</span>
                        <span className="text-xs font-medium text-slate-400">({v.purpose})</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 text-right">
                        <div>{sh("gate.checkedIn", { time: v.checkIn })}</div>
                        <div className="text-rose-500">{sh("gate.checkedOut", { time: v.checkOut })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </Surface>

            {/* Guard Patrol Patrol Route Verification */}
            <Surface variant="primary" className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">{sh("patrol.title")}</h3>
                <p className="text-xs text-slate-500 font-semibold">{sh("patrol.subtitle")}</p>
              </div>

              <div className="space-y-4">
                {checkpoints.map((cp) => (
                  <div 
                    key={cp.id} 
                    className={`p-3.5 border rounded-2xl flex items-start gap-3 justify-between transition-all ${
                      cp.status === "VERIFIED" 
                        ? "bg-emerald-50/40 border-emerald-100" 
                        : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase ${
                          cp.status === "VERIFIED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {cp.status}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">{sh("patrol.assignedTo", { officer: cp.officer })}</span>
                      </div>
                      
                      <h4 className="text-xs font-extrabold text-slate-800 leading-snug">{cp.name}</h4>
                      {cp.status === "VERIFIED" && (
                        <p className="text-xs font-bold text-slate-500">{sh("patrol.securedAt", { time: cp.time })}</p>
                      )}
                    </div>

                    {cp.status === "PENDING" && isSecurityOnly && (
                      <Button
                        size="compact"
                        onClick={() => handleVerifyCheckpoint(cp.id)}
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-indigo-950 text-white p-4 rounded-2xl border border-slate-800 text-center space-y-2">
                <Smartphone className="w-5 h-5 mx-auto text-indigo-400 animate-bounce" />
                <h4 className="text-xs font-bold">{sh("patrol.deployApp")}</h4>
                <p className="text-xs text-slate-300">{sh("patrol.deployAppHint")}</p>
              </div>

            </Surface>

          </div>

        </div>
      )}

      {activeTab === "LOGS_FEED" && (
        <Surface variant="primary" className="p-0 overflow-hidden">
          {/* Advanced Filters Header */}
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isVpa ? sh("logs.vpaTitle") : sh("logs.officerTitle")}
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  {isVpa 
                    ? sh("logs.vpaSubtitle") 
                    : sh("logs.officerSubtitle")
                  }
                </p>
              </div>

              {/* Quick Toggle Mode for VPA to focus on {sh("logs.incidentReports")} */}
              {isVpa && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => logFilters.clear()}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      selectedType === "ALL" && selectedSeverity === "ALL"
                        ? "bg-white text-slate-900 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {sh("logs.allLogs")}
                  </button>
                  <button
                    onClick={() => {
                      logFilters.clear();
                      logFilters.setValue("type", "INCIDENT");
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      selectedType === "INCIDENT"
                        ? "bg-rose-500 text-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {sh("logs.incidentsOnly")}
                  </button>
                </div>
              )}
            </div>

            {/* Interactive filter row */}
            <div className="pt-2">
              <ListFilterBar
                fields={logFilterFields}
                q={logFilters.q}
                onSearchChange={logFilters.setQ}
                values={logFilters.values}
                onValueChange={logFilters.setValue}
                onClear={logFilters.clear}
                searchPlaceholder={sh("logs.searchPlaceholder")}
                shownCount={filteredLogs.length}
                savedViewsScope={school?.id ? `${school.id}:security-logs` : undefined}
              />
            </div>
          </div>

          {/* Logs Feed */}
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold italic">
                {sh("logs.loading")}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-3">
                <Shield className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold italic">{sh("logs.emptyTitle")}</p>
                <p className="text-xs text-slate-500">{sh("logs.emptyHint")}</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] ${
                        log.type === "INCIDENT" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                        log.type === "VISITOR" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        "bg-indigo-50 text-indigo-600 border border-indigo-100"
                      }`}>
                        {log.type === "INCIDENT" ? <AlertTriangle className="w-5.5 h-5.5" /> : <UserCheck className="w-5.5 h-5.5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${
                            log.type === "INCIDENT" ? "bg-rose-100 text-rose-700" :
                            log.type === "VISITOR" ? "bg-emerald-100 text-emerald-700" :
                            "bg-indigo-100 text-indigo-700"
                          }`}>
                            {log.type}
                          </span>
                          <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${
                            log.severity === "CRITICAL" ? "bg-rose-600 text-white" :
                            log.severity === "HIGH" ? "bg-amber-100 text-amber-700" :
                            log.severity === "MEDIUM" ? "bg-blue-100 text-blue-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {sh("logs.severitySuffix", { severity: log.severity })}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-slate-800 text-sm leading-snug">
                          {log.description}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 flex-wrap pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {log.location || sh("logs.generalCampus")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {format(new Date(log.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {sh("logs.loggedBy", { name: log.logger?.name || sh("logs.systemSafeguard") })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:self-center items-center gap-2 self-end">
                      {log.type === "INCIDENT" && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                          {sh("logs.underAudit")}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" aria-label={sh("logs.moreActions")}>
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Surface>
      )}

      {/* MODAL 1: Add Security Log Dialog */}
      {showModal && isSecurityOnly && (
        <SecurityLogModal
          checkpoints={checkpoints}
          formData={formData}
          handleSubmit={handleSubmit}
          setFormData={setFormData}
          setShowModal={setShowModal}
          submitting={submitting}
        />
      )}

      {/* MODAL 2: {sh("gate.registerVisitor")} Access Pass */}
      {showVisitorModal && isSecurityOnly && (
        <VisitorPassModal
          handleAddVisitor={handleAddVisitor}
          newVisitor={newVisitor}
          setNewVisitor={setNewVisitor}
          setShowVisitorModal={setShowVisitorModal}
        />
      )}

    </PageShell>
  );
};
