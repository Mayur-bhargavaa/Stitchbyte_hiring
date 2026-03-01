"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Users,
    CheckCircle2,
    Calendar,
    Activity,
    Search,
    Video,
    Clock,
    Settings as SettingsIcon,
    Plus,
    Trash2,
    Save,
    CalendarDays,
    Lock as LockIcon,
    RefreshCw,
    XCircle,
    Eye,
    UserX,
    X,
    User,
    Mail,
    Phone,
    Bell,
    ShieldAlert,
    MailCheck,
    BarChart3,
    Play,
    RotateCcw,
    UserPlus,
    ToggleLeft,
    ToggleRight,
    FileQuestion,
    LayoutDashboard,
    AlertTriangle,
    Edit,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image"; // Added Image import

interface Candidate {
    candidateId: string;
    name: string;
    email: string;
    phone: string;
    salaryComfort: boolean;
    quizScore: number;
    quizTotal: number;
    tabViolations: number;
    cameraViolations: number;
    referencePhoto?: string;
    qualificationStatus: string;
    interviewStatus?: string; // Made optional
    submissionDate: string;
    interviewDate?: string; // Added
    interviewTime?: string; // Added
    meetingLink?: string; // Added
}

interface Stats {
    total: number;
    qualified: number;
    rejected: number;
    booked: number;
    conversionRate: string;
}

interface EmailQueueItem {
    _id: string;
    to: string;
    subject: string;
    type: string;
    status: "pending" | "sending" | "sent" | "failed" | "cancelled";
    attempts: number;
    error?: string;
    createdAt: string;
}

interface NotificationPreferences {
    sendQualificationEmail: boolean;
    sendRejectionEmail: boolean;
    sendBookingConfirmationEmail: boolean;
    sendInterviewReminderEmail: boolean;
    reminderHoursBefore: number;
    notifyAdminOnNewApplication: boolean;
    notifyAdminOnQualified: boolean;
    adminEmail: string;
    enableEmailQueue: boolean;
    maxEmailsPerMinute: number;
}

interface RiskData {
    summary: {
        totalCandidates: number;
        highRiskCandidates: number;
        duplicateDevices: number;
        suspiciousQualified: number;
    };
    risks: Array<{
        category: string;
        level: "LOW" | "MEDIUM" | "HIGH";
        issue: string;
        impact: string;
        recommendation: string;
    }>;
    phase1Implemented: string[];
    phase2Recommended: string[];
}

interface RegisteredCID {
    _id?: string;
    candidateId: string;
    candidateName: string;
    email: string;
    testStartDate: string;
    testStartTime: string;
    testEndDate: string;
    testEndTime: string;
    isActive: boolean;
    createdAt?: string;
}

export default function DashboardPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [filtered, setFiltered] = useState<Candidate[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("Overview");

    // Admin Data
    const [questions, setQuestions] = useState<Array<Record<string, unknown>>>([]);
    const [appSettings, setAppSettings] = useState<Record<string, unknown> | null>(null);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [emailQueue, setEmailQueue] = useState<EmailQueueItem[]>([]);
    const [emailQueueLoading, setEmailQueueLoading] = useState(false);
    const [emailQueueActionLoading, setEmailQueueActionLoading] = useState(false);
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
    const [prefsSaving, setPrefsSaving] = useState(false);
    const [riskData, setRiskData] = useState<RiskData | null>(null);
    const [riskLoading, setRiskLoading] = useState(false);

    // Registered Candidates State
    const [registeredCIDs, setRegisteredCIDs] = useState<RegisteredCID[]>([]);
    const [regLoading, setRegLoading] = useState(false);
    const [regForm, setRegForm] = useState<RegisteredCID>({
        candidateId: "", candidateName: "", email: "",
        testStartDate: "", testStartTime: "00:00",
        testEndDate: "", testEndTime: "23:59",
        isActive: true,
    });
    const [regSaving, setRegSaving] = useState(false);
    const [regEditMode, setRegEditMode] = useState(false);
    const [regCIDLookupLoading, setRegCIDLookupLoading] = useState(false);

    // Interview date input
    const [newInterviewDate, setNewInterviewDate] = useState("");

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");

    // View Modal
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    useEffect(() => {
        const savedToken = localStorage.getItem("admin_token");
        if (savedToken) {
            setToken(savedToken);
            setIsAuthenticated(true);
        }
    }, []);

    const authFetch = (url: string, options: RequestInit = {}) =>
        fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });

    async function fetchData() {
        setLoading(true);
        const statsRes = await authFetch("/api/dashboard/stats");
        const statsData = await statsRes.json();
        setStats(statsData.basic || statsData);

        const dataRes = await authFetch("/api/candidates");
        const data = await dataRes.json();
        if (data.success) {
            setCandidates(data.candidates);
            setFiltered(data.candidates);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    const fetchQuestions = async () => {
        const res = await authFetch("/api/admin/questions");
        const data = await res.json();
        if (data.success) setQuestions(data.questions);
    };

    const fetchSettings = async () => {
        const res = await authFetch("/api/admin/settings");
        const data = await res.json();
        if (data.success) setAppSettings(data.settings);
    };

    const saveSettings = async () => {
        setSettingsSaving(true);
        try {
            if (!appSettings) {
                alert("No settings to save");
                setSettingsSaving(false);
                return;
            }
            
            console.log("Saving settings:", appSettings);
            
            const res = await authFetch("/api/admin/settings", {
                method: "POST",
                body: JSON.stringify(appSettings)
            });
            
            const data = await res.json();
            console.log("Settings save response:", data);
            
            if (res.ok && data.success) {
                setAppSettings(data.settings);
                alert("Settings saved successfully!");
                // Refetch to confirm data persisted
                setTimeout(() => fetchSettings(), 500);
            } else {
                alert(data.error || data.details || "Failed to save settings");
            }
        } catch (err) {
            console.error("Save settings error:", err);
            alert(`Failed to save settings: ${err instanceof Error ? err.message : String(err)}`);
        }
        setSettingsSaving(false);
    };

    const fetchEmailQueue = async () => {
        setEmailQueueLoading(true);
        try {
            const res = await authFetch("/api/admin/email-queue");
            const data = await res.json();
            if (data.success) setEmailQueue(data.emails || []);
        } finally {
            setEmailQueueLoading(false);
        }
    };

    const runEmailQueueAction = async (action: "process" | "retry" | "cancel", emailId?: string) => {
        setEmailQueueActionLoading(true);
        try {
            const res = await authFetch("/api/admin/email-queue", {
                method: "POST",
                body: JSON.stringify({ action, emailId }),
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.error || "Action failed");
            }
            await fetchEmailQueue();
        } finally {
            setEmailQueueActionLoading(false);
        }
    };

    const fetchNotificationPrefs = async () => {
        const res = await authFetch("/api/admin/notifications");
        const data = await res.json();
        if (data.success) setNotificationPrefs(data.preferences);
    };

    const saveNotificationPrefs = async () => {
        if (!notificationPrefs) return;
        setPrefsSaving(true);
        try {
            const res = await authFetch("/api/admin/notifications", {
                method: "POST",
                body: JSON.stringify(notificationPrefs),
            });
            const data = await res.json();
            if (data.success) alert("Notification preferences saved!");
            else alert(data.error || "Failed to save preferences");
        } finally {
            setPrefsSaving(false);
        }
    };

    const fetchRiskData = async () => {
        setRiskLoading(true);
        try {
            const res = await authFetch("/api/admin/risk-analysis");
            const data = await res.json();
            if (data.success) setRiskData(data);
        } finally {
            setRiskLoading(false);
        }
    };

    const fetchRegisteredCIDs = async () => {
        setRegLoading(true);
        try {
            const res = await authFetch("/api/admin/registered-candidates");
            const data = await res.json();
            if (data.success) setRegisteredCIDs(data.candidates || []);
        } finally {
            setRegLoading(false);
        }
    };

    const fetchCandidateDataByCID = async (cid: string) => {
        if (!cid.trim() || regEditMode) return; // Don't fetch in edit mode
        
        setRegCIDLookupLoading(true);
        try {
            const res = await fetch(`/api/candidates/${cid}`);
            const data = await res.json();
            
            if (!data.error && data.name && data.email) {
                // Auto-populate name and email
                setRegForm(prev => ({
                    ...prev,
                    candidateName: data.name || "",
                    email: data.email || "",
                }));
                console.log(`✅ Auto-populated name and email for CID: ${cid}`);
            } else {
                // If candidate not found, clear the fields
                if (data.error) {
                    setRegForm(prev => ({
                        ...prev,
                        candidateName: "",
                        email: "",
                    }));
                }
            }
        } catch (err) {
            console.error("Error fetching candidate by CID:", err);
        } finally {
            setRegCIDLookupLoading(false);
        }
    };

    const saveRegisteredCID = async () => {
        if (!regForm.candidateId || !regForm.candidateName || !regForm.testStartDate || !regForm.testEndDate) {
            alert("CID, Name, Start Date, and End Date are required.");
            return;
        }
        setRegSaving(true);
        try {
            const res = await authFetch("/api/admin/registered-candidates", {
                method: "POST",
                body: JSON.stringify(regForm),
            });
            const data = await res.json();
            if (data.success) {
                alert(data.updated ? "Candidate updated!" : "Candidate registered!");
                setRegForm({ candidateId: "", candidateName: "", email: "", testStartDate: "", testStartTime: "00:00", testEndDate: "", testEndTime: "23:59", isActive: true });
                setRegEditMode(false);
                fetchRegisteredCIDs();
            } else {
                alert(data.error || "Failed to save");
            }
        } finally {
            setRegSaving(false);
        }
    };

    const deleteRegisteredCID = async (candidateId: string) => {
        if (!confirm(`Delete registered CID ${candidateId}?`)) return;
        try {
            const res = await authFetch(`/api/admin/registered-candidates?candidateId=${candidateId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) fetchRegisteredCIDs();
            else alert(data.error || "Failed to delete");
        } catch {
            alert("Failed to delete");
        }
    };

    const editRegisteredCID = (cid: RegisteredCID) => {
        setRegForm({ ...cid });
        setRegEditMode(true);
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        if (activeTab === "Questions") fetchQuestions();
        if (activeTab === "Settings") fetchSettings();
        if (activeTab === "Email Queue") fetchEmailQueue();
        if (activeTab === "Notifications") fetchNotificationPrefs();
        if (activeTab === "Risk Analysis") fetchRiskData();
        if (activeTab === "Registered CIDs") fetchRegisteredCIDs();
    }, [activeTab, isAuthenticated]);

    useEffect(() => {
        let result = candidates;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(
                (c) =>
                    c.name.toLowerCase().includes(lower) ||
                    c.email.toLowerCase().includes(lower) ||
                    c.candidateId.toLowerCase().includes(lower)
            );
        }
        if (filterStatus !== "All") {
            result = result.filter((c) => c.qualificationStatus === filterStatus);
        }
        setFiltered(result);
    }, [searchTerm, filterStatus, candidates]);

    const viewCandidate = (c: Candidate) => setSelectedCandidate(c);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card max-w-sm w-full p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--sb-violet)] rounded-full mix-blend-multiply filter blur-[60px] opacity-20 transform translate-x-1/2 -translate-y-1/2" />
                    <div className="relative text-center">
                        <LockIcon className="w-12 h-12 text-[var(--sb-violet-light)] mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
                        <p className="text-sm text-[var(--sb-gray-400)] mb-6">Secured Area</p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const res = await fetch("/api/auth/login", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ password }),
                            });
                            const data = await res.json();
                            if (data.success) {
                                localStorage.setItem("admin_token", data.token);
                                setToken(data.token);
                                setIsAuthenticated(true);
                            } else {
                                alert(data.error || "Invalid password");
                            }
                        }} className="space-y-4">
                            <input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <button type="submit" className="w-full py-3 rounded-xl gradient-bg text-white font-semibold flex items-center justify-center gap-2">
                                <LockIcon className="w-4 h-4" /> Enter Dashboard
                            </button>
                        </form>
                        <Link href="/" className="inline-flex items-center gap-2 mt-6 text-sm hover:text-white transition-colors" style={{ color: "var(--sb-gray-500)" }}>
                            Back Here
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex overflow-hidden">
            {/* Fixed Sidebar */}
            <aside className="w-64 bg-[#0a0f1e] border-r border-white/10 flex flex-col fixed h-screen z-50">
                {/* Logo Section */}
                <div className="p-6 border-b border-white/10">
                    <Image src="/logo-stitchbyte.png" alt="Stitchbyte Logo" width={160} height={32} className="h-8 w-auto mb-2" priority />
                    <h1 className="text-sm font-semibold text-[var(--sb-gray-400)] uppercase tracking-wider">Admin Portal</h1>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-1">
                        {[
                            { name: "Overview", icon: LayoutDashboard, key: "Overview" },
                            { name: "Applicants", icon: Users, key: "Applicants" },
                            { name: "Registered CIDs", icon: UserPlus, key: "Registered CIDs" },
                            { name: "Questions", icon: FileQuestion, key: "Questions" },
                            { name: "Settings", icon: SettingsIcon, key: "Settings" },
                            { name: "Email Queue", icon: MailCheck, key: "Email Queue" },
                            { name: "Notifications", icon: Bell, key: "Notifications" },
                            { name: "Risk Analysis", icon: ShieldAlert, key: "Risk Analysis" },
                        ].map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setActiveTab(item.key)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === item.key
                                        ? "bg-[var(--sb-violet)] text-white shadow-lg"
                                        : "text-[var(--sb-gray-400)] hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                <span className="truncate">{item.name}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/10 space-y-2">
                    <a 
                        href="https://meet.stitchbyte.in/" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition-colors border border-white/10"
                    >
                        <Video className="w-4 h-4 text-[var(--sb-violet-light)]" /> 
                        <span>Meetings</span>
                    </a>
                    <button
                        onClick={() => {
                            localStorage.removeItem("admin_token");
                            setToken("");
                            setIsAuthenticated(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 text-sm font-medium text-white hover:bg-rose-500/10 hover:text-rose-400 transition-colors border border-white/10"
                    >
                        <LockIcon className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 ml-64 flex flex-col">
                {/* Top Header */}
                <header className="sticky top-0 z-40 bg-[#0f1419]/95 backdrop-blur-xl border-b border-white/10 px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{activeTab}</h2>
                            <p className="text-sm text-[var(--sb-gray-400)]">
                                {activeTab === "Overview" && "Dashboard overview and key metrics"}
                                {activeTab === "Applicants" && `Viewing ${filtered.length} candidates`}
                                {activeTab === "Registered CIDs" && `${registeredCIDs.length} registered candidates`}
                                {activeTab === "Questions" && `${questions.length} questions in database`}
                                {activeTab === "Settings" && "Portal configuration"}
                                {activeTab === "Email Queue" && `${emailQueue.length} emails in queue`}
                                {activeTab === "Notifications" && "Notification preferences"}
                                {activeTab === "Risk Analysis" && "Integrity & security analysis"}
                            </p>
                        </div>
                        <button
                            onClick={() => fetchData()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--sb-violet)] text-white font-medium hover:bg-[var(--sb-violet)]/80 transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-[#0a0f1e] via-[#0f1419] to-[#0a0f1e]">
                    {/* Overview Dashboard */}
                    {activeTab === "Overview" && (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6 hover:border-[var(--sb-violet)]/30 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-[var(--sb-violet)]/10 flex items-center justify-center">
                                            <Users className="w-6 h-6 text-[var(--sb-violet-light)]" />
                                        </div>
                                        <span className="text-[var(--sb-gray-400)] text-xs uppercase tracking-wider font-semibold">Total</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-1">{stats?.total || 0}</h3>
                                    <p className="text-sm text-[var(--sb-gray-400)]">Total Applications</p>
                                </div>

                                <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <span className="text-[var(--sb-gray-400)] text-xs uppercase tracking-wider font-semibold">Qualified</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-1">{stats?.qualified || 0}</h3>
                                    <p className="text-sm text-[var(--sb-gray-400)]">Passed Assessment</p>
                                </div>

                                <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6 hover:border-rose-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                            <XCircle className="w-6 h-6 text-rose-400" />
                                        </div>
                                        <span className="text-[var(--sb-gray-400)] text-xs uppercase tracking-wider font-semibold">Rejected</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-1">{stats?.rejected || 0}</h3>
                                    <p className="text-sm text-[var(--sb-gray-400)]">Did Not Qualify</p>
                                </div>

                                <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                            <Activity className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <span className="text-[var(--sb-gray-400)] text-xs uppercase tracking-wider font-semibold">Rate</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-1">{stats?.conversionRate || 0}%</h3>
                                    <p className="text-sm text-[var(--sb-gray-400)]">Conversion Rate</p>
                                </div>
                            </div>

                            {/* Quick Actions & Recent Activity */}
                            <div className="grid lg:grid-cols-2 gap-6">
                                <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <LayoutDashboard className="w-5 h-5 text-[var(--sb-violet-light)]" />
                                        Quick Actions
                                    </h3>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setActiveTab("Applicants")}
                                            className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--sb-violet)]/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Users className="w-5 h-5 text-[var(--sb-gray-400)] group-hover:text-[var(--sb-violet-light)]" />
                                                <div className="text-left">
                                                    <p className="text-white font-medium">View All Applicants</p>
                                                    <p className="text-xs text-[var(--sb-gray-400)]">{candidates.length} total candidates</p>
                                                </div>
                                            </div>
                                            <Eye className="w-4 h-4 text-[var(--sb-gray-500)]" />
                                        </button>

                                        <button
                                            onClick={() => setActiveTab("Registered CIDs")}
                                            className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--sb-violet)]/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <UserPlus className="w-5 h-5 text-[var(--sb-gray-400)] group-hover:text-[var(--sb-violet-light)]" />
                                                <div className="text-left">
                                                    <p className="text-white font-medium">Manage Registered CIDs</p>
                                                    <p className="text-xs text-[var(--sb-gray-400)]">{registeredCIDs.length} registered</p>
                                                </div>
                                            </div>
                                            <Eye className="w-4 h-4 text-[var(--sb-gray-500)]" />
                                        </button>

                                        <button
                                            onClick={() => setActiveTab("Settings")}
                                            className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--sb-violet)]/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <SettingsIcon className="w-5 h-5 text-[var(--sb-gray-400)] group-hover:text-[var(--sb-violet-light)]" />
                                                <div className="text-left">
                                                    <p className="text-white font-medium">Portal Settings</p>
                                                    <p className="text-xs text-[var(--sb-gray-400)]">Configure portal</p>
                                                </div>
                                            </div>
                                            <Eye className="w-4 h-4 text-[var(--sb-gray-500)]" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-cyan-400" />
                                        Recent Applicants
                                    </h3>
                                    <div className="space-y-3">
                                        {candidates.slice(0, 5).map((c) => (
                                            <div key={c.candidateId} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    {c.referencePhoto ? (
                                                        <img src={c.referencePhoto} alt="Ref" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center font-bold text-xs text-white">
                                                            {c.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-white text-sm font-medium">{c.name}</p>
                                                        <p className="text-xs text-[var(--sb-gray-400)]">{c.quizScore}/{c.quizTotal}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    c.qualificationStatus === "Qualified" 
                                                        ? "bg-emerald-500/10 text-emerald-400" 
                                                        : "bg-rose-500/10 text-rose-400"
                                                }`}>
                                                    {c.qualificationStatus}
                                                </span>
                                            </div>
                                        ))}
                                        {candidates.length === 0 && (
                                            <p className="text-center text-[var(--sb-gray-400)] py-8">No applicants yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Applicants" && (
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: "Total Apps", val: stats?.total || 0, color: "var(--sb-violet-light)", ic: Users },
                                    { label: "Qualified", val: stats?.qualified || 0, color: "var(--sb-green-light)", ic: CheckCircle2 },
                                    { label: "Rejected", val: stats?.rejected || 0, color: "var(--sb-red-light)", ic: XCircle },
                                    { label: "Conversion", val: `${stats?.conversionRate || 0}%`, color: "var(--sb-teal)", ic: Activity },
                                ].map((s, i) => (
                                    <div key={i} className="bg-[#151b2b] border border-white/10 rounded-xl p-5 hover:border-[var(--sb-violet)]/30 transition-all relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <s.ic className="w-12 h-12" style={{ color: s.color }} />
                                        </div>
                                        <p className="text-xs font-semibold text-[var(--sb-gray-400)] uppercase tracking-wider mb-2">{s.label}</p>
                                        <h3 className="text-3xl font-bold text-white tracking-tight">{s.val}</h3>
                                    </div>
                                ))}
                            </div>

                            {/* Filters */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sb-gray-500)]" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by name, email, or ID..." 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                        className="w-full pl-10 pr-4 py-3 bg-[#151b2b] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                    />
                                </div>
                                <div className="flex items-center gap-2 p-1 bg-[#151b2b] border border-white/10 rounded-lg">
                                    {["All", "Qualified", "Not Qualified"].map((s) => (
                                        <button 
                                            key={s} 
                                            onClick={() => setFilterStatus(s)} 
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                                filterStatus === s 
                                                    ? "bg-[var(--sb-violet)] text-white shadow-lg" 
                                                    : "text-[var(--sb-gray-400)] hover:text-white"
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="bg-[#151b2b] border border-white/10 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--sb-gray-400)] bg-black/30">
                                                <th className="px-6 py-4 font-semibold">Candidate</th>
                                                <th className="px-6 py-4 font-semibold">Score</th>
                                                <th className="px-6 py-4 font-semibold">Integrity</th>
                                                <th className="px-6 py-4 font-semibold">Status</th>
                                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filtered.map((c) => (
                                                <tr key={c.candidateId} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {c.referencePhoto ? (
                                                                <img src={c.referencePhoto} alt="Ref" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center font-bold text-white shadow-inner">
                                                                    {c.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-semibold text-white">{c.name}</div>
                                                                <div className="text-xs text-[var(--sb-gray-400)] font-mono">{c.candidateId}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-white font-medium">{c.quizScore} <span className="text-[var(--sb-gray-500)]">/ {c.quizTotal}</span></div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1 text-xs">
                                                            <span className={c.tabViolations > 0 ? "text-[var(--sb-amber-light)]" : "text-[var(--sb-gray-400)]"}>Tabs: {c.tabViolations}</span>
                                                            <span className={c.cameraViolations > 0 ? "text-[var(--sb-red-light)]" : "text-[var(--sb-gray-400)]"}>Cam: {c.cameraViolations || 0}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                                                                c.interviewStatus === "Scheduled" 
                                                                    ? "bg-[rgba(124,58,237,0.1)] text-[var(--sb-violet-light)] border border-[rgba(124,58,237,0.2)]" :
                                                                    c.qualificationStatus === "Qualified" 
                                                                        ? "bg-[rgba(16,185,129,0.1)] text-[var(--sb-green-light)] border border-[rgba(16,185,129,0.2)]" :
                                                                        "bg-[rgba(239,68,68,0.1)] text-[var(--sb-red-light)] border border-[rgba(239,68,68,0.2)]"
                                                            }`}>
                                                                {c.interviewStatus === "Scheduled" ? "Scheduled" : c.qualificationStatus}
                                                            </span>
                                                            {c.interviewStatus === "Scheduled" && c.interviewDate && c.interviewTime && (
                                                                <span className="text-[10px] text-[var(--sb-gray-400)] flex items-center gap-1 mt-0.5">
                                                                    <Clock className="w-3 h-3 text-[var(--sb-violet)]" /> {c.interviewDate} ({c.interviewTime})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {c.qualificationStatus === "Qualified" && (
                                                                <Link 
                                                                    href={`/book?cid=${c.candidateId}`} 
                                                                    target="_blank" 
                                                                    className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[var(--sb-violet-light)] hover:text-white hover:bg-[var(--sb-violet)]/20 transition-all" 
                                                                    title="View Booking Page"
                                                                >
                                                                    <Calendar className="w-4 h-4" />
                                                                </Link>
                                                            )}
                                                            <button 
                                                                onClick={() => viewCandidate(c)} 
                                                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[var(--sb-gray-400)] hover:text-white hover:bg-white/10 transition-all" 
                                                                title="View Profile"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filtered.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--sb-gray-400)]">
                                                        <UserX className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                        <p>No candidates found matching criteria.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                {activeTab === "Registered CIDs" && (
                    <div className="space-y-6">
                        {/* Registration Form */}
                        <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-[var(--sb-violet-light)]" />
                                {regEditMode ? "Edit Registered Candidate" : "Register New Candidate"}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Candidate ID *</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={regForm.candidateId} 
                                            onChange={(e) => {
                                                const newCid = e.target.value.toUpperCase();
                                                setRegForm({ ...regForm, candidateId: newCid });
                                                if (newCid.length > 0) {
                                                    fetchCandidateDataByCID(newCid);
                                                }
                                            }} 
                                            placeholder="SB-BDE-0001" 
                                            disabled={regEditMode} 
                                            className="w-full pr-8 bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors"
                                        />
                                        {regCIDLookupLoading && (
                                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                                <RefreshCw className="w-4 h-4 animate-spin text-[var(--sb-violet)]" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block flex items-center gap-1">
                                        Name 
                                        {regForm.candidateName && !regEditMode && <span className="text-[10px] text-[var(--sb-violet)] font-semibold">← auto-filled</span>}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={regForm.candidateName} 
                                        onChange={(e) => setRegForm({ ...regForm, candidateName: e.target.value })} 
                                        placeholder="John Doe" 
                                        className={`w-full bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors ${regForm.candidateName && !regEditMode ? 'bg-[var(--sb-violet)]/10 border-[var(--sb-violet)]/20' : ''}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block flex items-center gap-1">
                                        Email
                                        {regForm.email && !regEditMode && <span className="text-[10px] text-[var(--sb-violet)] font-semibold">← auto-filled</span>}
                                    </label>
                                    <input 
                                        type="email" 
                                        value={regForm.email} 
                                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} 
                                        placeholder="john@example.com" 
                                        className={`w-full bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors ${regForm.email && !regEditMode ? 'bg-[var(--sb-violet)]/10 border-[var(--sb-violet)]/20' : ''}`}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                                        <input type="checkbox" checked={regForm.isActive} onChange={(e) => setRegForm({ ...regForm, isActive: e.target.checked })} className="w-4 h-4" />
                                        Active
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div>
                                    <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Test Start Date *</label>
                                    <input 
                                        type="date" 
                                        value={regForm.testStartDate} 
                                        onChange={(e) => setRegForm({ ...regForm, testStartDate: e.target.value })} 
                                        className="w-full bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Test Start Time</label>
                                    <input 
                                        type="time" 
                                        value={regForm.testStartTime} 
                                        onChange={(e) => setRegForm({ ...regForm, testStartTime: e.target.value })} 
                                        className="w-full bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Test End Date *</label>
                                    <input 
                                        type="date" 
                                        value={regForm.testEndDate} 
                                        onChange={(e) => setRegForm({ ...regForm, testEndDate: e.target.value })} 
                                        className="w-full bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Test End Time</label>
                                    <input 
                                        type="time" 
                                        value={regForm.testEndTime} 
                                        onChange={(e) => setRegForm({ ...regForm, testEndTime: e.target.value })} 
                                        className="w-full bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={saveRegisteredCID} 
                                    disabled={regSaving} 
                                    className="px-6 py-3 rounded-lg bg-[var(--sb-violet)] text-white font-semibold flex items-center gap-2 disabled:opacity-50 hover:bg-[var(--sb-violet)]/80 transition-all"
                                >
                                    {regSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {regEditMode ? "Update" : "Register"}
                                </button>
                                {regEditMode && (
                                    <button 
                                        onClick={() => { 
                                            setRegEditMode(false); 
                                            setRegForm({ candidateId: "", candidateName: "", email: "", testStartDate: "", testStartTime: "00:00", testEndDate: "", testEndTime: "23:59", isActive: true }); 
                                        }} 
                                        className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Registered List */}
                        <div className="bg-[#151b2b] border border-white/10 rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Registered Candidates ({registeredCIDs.length})</h3>
                                    <p className="text-sm text-[var(--sb-gray-400)]">Only these CIDs can access the assessment.</p>
                                </div>
                                <button 
                                    onClick={fetchRegisteredCIDs} 
                                    className="w-10 h-10 rounded-lg bg-[var(--sb-violet)] flex items-center justify-center hover:bg-[var(--sb-violet)]/80 transition-all text-white"
                                >
                                    <RefreshCw className={`w-4 h-4 ${regLoading ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--sb-gray-400)] bg-black/30">
                                            <th className="px-6 py-4 font-semibold">CID</th>
                                            <th className="px-6 py-4 font-semibold">Name</th>
                                            <th className="px-6 py-4 font-semibold">Email</th>
                                            <th className="px-6 py-4 font-semibold">Test Window</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {registeredCIDs.map((rc) => {
                                            const now = new Date();
                                            const start = new Date(`${rc.testStartDate}T${rc.testStartTime || "00:00"}:00`);
                                            const end = new Date(`${rc.testEndDate}T${rc.testEndTime || "23:59"}:00`);
                                            const isExpired = now > end;
                                            const isUpcoming = now < start;
                                            const isLive = now >= start && now <= end;

                                            return (
                                                <tr key={rc.candidateId} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-4 font-mono text-sm text-[var(--sb-violet-light)]">{rc.candidateId}</td>
                                                    <td className="px-6 py-4 text-white font-medium">{rc.candidateName}</td>
                                                    <td className="px-6 py-4 text-[var(--sb-gray-300)] text-sm">{rc.email || "—"}</td>
                                                    <td className="px-6 py-4 text-xs text-[var(--sb-gray-300)]">
                                                        {rc.testStartDate} {rc.testStartTime} — {rc.testEndDate} {rc.testEndTime}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                                                            !rc.isActive ? "bg-white/10 text-white/50 border border-white/10" :
                                                            isExpired ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" :
                                                            isLive ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" :
                                                            "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                                        }`}>
                                                            {!rc.isActive ? "Inactive" : isExpired ? "Expired" : isLive ? "Live" : "Upcoming"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button 
                                                                onClick={() => editRegisteredCID(rc)} 
                                                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[var(--sb-gray-400)] hover:text-white hover:bg-white/10 transition-all" 
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteRegisteredCID(rc.candidateId)} 
                                                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[var(--sb-gray-400)] hover:text-rose-400 hover:bg-rose-400/5 transition-all" 
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {registeredCIDs.length === 0 && !regLoading && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-[var(--sb-gray-400)]">
                                                    <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p>No registered candidates yet. Add one above.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "Questions" && (
                    <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6 min-h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Assessment Bank</h2>
                                <p className="text-sm text-[var(--sb-gray-400)]">Manage dynamic questions for the BDE portal.</p>
                            </div>
                            <button className="px-5 py-2.5 rounded-lg bg-[var(--sb-violet)] text-white font-semibold flex items-center gap-2 text-sm hover:bg-[var(--sb-violet)]/80 transition-all">
                                <Plus className="w-4 h-4" /> Add Question
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {questions.map((q, i) => (
                                <div key={q._id || i} className="p-5 rounded-lg bg-[#0f1419] border border-white/10 hover:border-[var(--sb-violet)]/30 transition-all">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                }`}>
                                                    {q.difficulty}
                                                </span>
                                                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{q.category}</span>
                                            </div>
                                            <h3 className="text-white font-medium mb-3 leading-relaxed">{q.text}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {q.options.map((opt: string, idx: number) => (
                                                    <div key={idx} className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                                                        idx === q.correctIndex 
                                                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                                                            : 'bg-white/5 text-white/40 border border-white/5'
                                                    }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${idx === q.correctIndex ? 'bg-emerald-400' : 'bg-white/10'}`} />
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                                <Activity className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-white/30 hover:text-rose-400 hover:bg-rose-400/5 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "Settings" && (
                    <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Exam Toggle */}
                            <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    {appSettings?.examEnabled !== false ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-rose-400" />}
                                    Exam Availability
                                </h3>
                                <div className="flex items-center justify-between p-4 rounded-lg bg-[#0f1419] border border-white/10">
                                    <div>
                                        <p className="text-white font-medium">Assessment Portal</p>
                                        <p className="text-xs text-[var(--sb-gray-400)]">When disabled, the landing page shows &quot;Exam Unavailable&quot; and candidates cannot start the test.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={appSettings?.examEnabled !== false}
                                            onChange={(e) => setAppSettings({ ...(appSettings || {}), examEnabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500/50"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <SettingsIcon className="w-5 h-5 text-[var(--sb-violet-light)]" /> Compensation Setup
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Fixed Base (Monthly)</label>
                                        <input 
                                            type="text" 
                                            value={String(appSettings?.salaryFixed || "")} 
                                            onChange={(e) => setAppSettings({ ...(appSettings || {}), salaryFixed: e.target.value })} 
                                            className="w-full bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Incentive Potential</label>
                                        <input 
                                            type="text" 
                                            value={String(appSettings?.salaryIncentive || "")} 
                                            onChange={(e) => setAppSettings({ ...(appSettings || {}), salaryIncentive: e.target.value })} 
                                            className="w-full bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-cyan-400" /> Interview Dates
                                </h3>
                                <p className="text-xs text-[var(--sb-gray-400)] mb-4">Add dates when interviews are available. Candidates will only see future dates.</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {(appSettings?.interviewDates as string[] || []).map((d: string) => (
                                        <div key={d} className="px-3 py-1.5 rounded-lg bg-[var(--sb-violet)]/10 border border-[var(--sb-violet)]/20 text-xs text-white flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-[var(--sb-violet-light)]" />
                                            {d}
                                            <button 
                                                onClick={() => {
                                                    const dates = (appSettings?.interviewDates as string[] || []).filter((dd: string) => dd !== d);
                                                    setAppSettings({ ...(appSettings || {}), interviewDates: dates });
                                                }} 
                                                className="text-white/30 hover:text-rose-400"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(appSettings?.interviewDates as string[] || []).length === 0 && (
                                        <p className="text-xs text-[var(--sb-gray-500)]">No dates configured yet.</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="date" 
                                        value={newInterviewDate} 
                                        onChange={(e) => setNewInterviewDate(e.target.value)} 
                                        className="flex-1 bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                    />
                                    <button 
                                        onClick={() => {
                                            if (!newInterviewDate) return;
                                            const existing = (appSettings?.interviewDates as string[] || []);
                                            if (existing.includes(newInterviewDate)) return;
                                            setAppSettings({ ...(appSettings || {}), interviewDates: [...existing, newInterviewDate].sort() });
                                            setNewInterviewDate("");
                                        }} 
                                        className="px-4 bg-[var(--sb-violet)] hover:bg-[var(--sb-violet)]/80 text-white rounded-lg text-xs font-bold uppercase transition-all"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-cyan-400" /> Time Slots
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Interview Time Slots</label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {appSettings?.interviewSlots?.map((s: string) => (
                                                <div key={s} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs text-white flex items-center gap-2">
                                                    {s}
                                                    <button 
                                                        onClick={() => {
                                                            const slots = (appSettings?.interviewSlots as string[] || []).filter((ss: string) => ss !== s);
                                                            setAppSettings({ ...(appSettings || {}), interviewSlots: slots });
                                                        }} 
                                                        className="text-white/30 hover:text-rose-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="time" 
                                                className="flex-1 bg-[#0f1419] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--sb-violet)] transition-colors" 
                                            />
                                            <button className="px-4 bg-[var(--sb-violet)] hover:bg-[var(--sb-violet)]/80 text-white rounded-lg text-xs font-bold uppercase transition-all">Add</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest text-white/50">Actions</h3>
                                <button
                                    onClick={saveSettings}
                                    disabled={settingsSaving}
                                    className="w-full py-4 rounded-lg bg-[var(--sb-violet)] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[var(--sb-violet)]/80 transition-all"
                                >
                                    {settingsSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Changes
                                </button>
                                <p className="text-[10px] text-white/30 text-center mt-4">These settings affect the landing page, apply portal, and booking system in real-time.</p>
                            </div>

                            <div className="bg-[#151b2b] border border-rose-500/20 rounded-xl p-6">
                                <h3 className="text-sm font-bold text-rose-400 mb-4 uppercase tracking-widest">Danger Zone</h3>
                                <button className="w-full py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all uppercase">
                                    Reset Assessment Bank
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "Email Queue" && (
                    <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6 min-h-[400px]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <MailCheck className="w-5 h-5 text-[var(--sb-violet-light)]" /> Email Queue
                                </h2>
                                <p className="text-sm text-[var(--sb-gray-400)]">Monitor pending/failed emails and run queue actions.</p>
                            </div>
                            <button
                                onClick={() => runEmailQueueAction("process")}
                                disabled={emailQueueActionLoading}
                                className="px-5 py-2.5 rounded-lg bg-[var(--sb-violet)] text-white font-semibold flex items-center gap-2 text-sm disabled:opacity-50 hover:bg-[var(--sb-violet)]/80 transition-all"
                            >
                                {emailQueueActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Process Queue
                            </button>
                        </div>

                        {emailQueueLoading ? (
                            <div className="flex items-center justify-center py-16 text-[var(--sb-gray-400)]">
                                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading queued emails...
                            </div>
                        ) : emailQueue.length === 0 ? (
                            <div className="text-center py-16 text-[var(--sb-gray-400)]">No emails in queue.</div>
                        ) : (
                            <div className="space-y-3">
                                {emailQueue.map((item) => (
                                    <div key={item._id} className="p-4 rounded-lg bg-[#0f1419] border border-white/10">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <div>
                                                <p className="text-white font-medium text-sm">{item.subject}</p>
                                                <p className="text-[var(--sb-gray-400)] text-xs">To: {item.to} • Type: {item.type} • Attempts: {item.attempts}</p>
                                                {item.error && <p className="text-[var(--sb-red-light)] text-xs mt-1">{item.error}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${item.status === "sent" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : item.status === "failed" ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" : item.status === "pending" ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-white/10 text-white/70 border border-white/10"}`}>{item.status}</span>
                                                {item.status === "failed" && (
                                                    <button onClick={() => runEmailQueueAction("retry", item._id)} className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center gap-1">
                                                        <RotateCcw className="w-3 h-3" /> Retry
                                                    </button>
                                                )}
                                                {item.status === "pending" && (
                                                    <button onClick={() => runEmailQueueAction("cancel", item._id)} className="px-3 py-1.5 rounded-lg text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300">
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "Notifications" && (
                    <div className="max-w-4xl mx-auto bg-[#151b2b] border border-white/10 rounded-xl p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2"><Bell className="w-5 h-5 text-[var(--sb-violet-light)]" /> Notification Preferences</h2>
                            <p className="text-sm text-[var(--sb-gray-400)]">Configure candidate and admin notifications.</p>
                        </div>

                        {!notificationPrefs ? (
                            <div className="flex items-center justify-center py-12 text-[var(--sb-gray-400)]"><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading preferences...</div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    {[
                                        { key: "sendQualificationEmail", label: "Qualification Emails" },
                                        { key: "sendRejectionEmail", label: "Rejection Emails" },
                                        { key: "sendBookingConfirmationEmail", label: "Booking Confirmation Emails" },
                                        { key: "sendInterviewReminderEmail", label: "Interview Reminder Emails" },
                                        { key: "enableEmailQueue", label: "Enable Email Queue" },
                                        { key: "notifyAdminOnNewApplication", label: "Notify Admin on New Application" },
                                        { key: "notifyAdminOnQualified", label: "Notify Admin on Qualified Candidate" },
                                    ].map((item) => (
                                        <label key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[#0f1419] border border-white/10 text-sm text-white hover:border-[var(--sb-violet)]/30 transition-colors cursor-pointer">
                                            <span>{item.label}</span>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(notificationPrefs[item.key as keyof NotificationPreferences])}
                                                onChange={(e) => setNotificationPrefs({ ...notificationPrefs, [item.key]: e.target.checked })}
                                            />
                                        </label>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Admin Email</label>
                                        <input type="email" value={notificationPrefs.adminEmail} onChange={(e) => setNotificationPrefs({ ...notificationPrefs, adminEmail: e.target.value })} className="w-full" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Reminder (Hours Before Interview)</label>
                                        <input type="number" min={1} value={notificationPrefs.reminderHoursBefore} onChange={(e) => setNotificationPrefs({ ...notificationPrefs, reminderHoursBefore: Number(e.target.value) })} className="w-full" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[var(--sb-gray-400)] uppercase font-bold tracking-wider mb-2 block">Max Emails Per Minute</label>
                                        <input type="number" min={1} value={notificationPrefs.maxEmailsPerMinute} onChange={(e) => setNotificationPrefs({ ...notificationPrefs, maxEmailsPerMinute: Number(e.target.value) })} className="w-full" />
                                    </div>
                                    <button onClick={saveNotificationPrefs} disabled={prefsSaving} className="w-full py-3 rounded-lg bg-[var(--sb-violet)] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[var(--sb-violet)]/80 transition-all mt-2">
                                        {prefsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Notification Preferences
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "Risk Analysis" && (
                    <div className="space-y-6">
                        <div className="bg-[#151b2b] border border-white/10 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-[var(--sb-red-light)]" /> Exam Risk Analysis
                                    </h2>
                                    <p className="text-sm text-[var(--sb-gray-400)]">Hiring integrity and reliability risk view.</p>
                                </div>
                                <button 
                                    onClick={fetchRiskData} 
                                    className="w-10 h-10 rounded-lg bg-[var(--sb-violet)] flex items-center justify-center hover:bg-[var(--sb-violet)]/80 transition-all text-white"
                                >
                                    <RefreshCw className={`w-4 h-4 ${riskLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {!riskData ? (
                                <div className="text-[var(--sb-gray-400)] py-12 text-center">
                                    {riskLoading ? "Loading risk analysis..." : "No risk data available."}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-[#0f1419] border border-white/10 rounded-lg p-4">
                                            <p className="text-xs text-[var(--sb-gray-400)] mb-1">Total Candidates</p>
                                            <p className="text-2xl font-bold text-white">{riskData.summary.totalCandidates}</p>
                                        </div>
                                        <div className="bg-[#0f1419] border border-white/10 rounded-lg p-4">
                                            <p className="text-xs text-[var(--sb-gray-400)] mb-1">High Risk Candidates</p>
                                            <p className="text-2xl font-bold text-[var(--sb-red-light)]">{riskData.summary.highRiskCandidates}</p>
                                        </div>
                                        <div className="bg-[#0f1419] border border-white/10 rounded-lg p-4">
                                            <p className="text-xs text-[var(--sb-gray-400)] mb-1">Duplicate Devices</p>
                                            <p className="text-2xl font-bold text-[var(--sb-amber-light)]">{riskData.summary.duplicateDevices}</p>
                                        </div>
                                        <div className="bg-[#0f1419] border border-white/10 rounded-lg p-4">
                                            <p className="text-xs text-[var(--sb-gray-400)] mb-1">Suspicious Qualified</p>
                                            <p className="text-2xl font-bold text-[var(--sb-violet-light)]">{riskData.summary.suspiciousQualified}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        {riskData.risks.map((risk, idx) => (
                                            <div key={`${risk.category}-${idx}`} className="p-4 rounded-lg bg-[#0f1419] border border-white/10 hover:border-[var(--sb-violet)]/30 transition-all">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                                    <p className="text-white font-semibold">{risk.category}: {risk.issue}</p>
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                                                        risk.level === "HIGH" ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" : 
                                                        risk.level === "MEDIUM" ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : 
                                                        "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                                    }`}>
                                                        {risk.level}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[var(--sb-gray-400)] mb-1">Impact: {risk.impact}</p>
                                                <p className="text-xs text-[var(--sb-violet-light)]">Recommendation: {risk.recommendation}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-[#0f1419] border border-white/10 rounded-lg p-4">
                                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-emerald-400" /> Phase 1 Implemented
                                            </h3>
                                            <ul className="space-y-1 text-xs text-[var(--sb-gray-300)]">
                                                {riskData.phase1Implemented.map((item) => <li key={item}>• {item}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-[#0f1419] border border-white/10 rounded-lg p-4">
                                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                <ShieldAlert className="w-4 h-4 text-[var(--sb-red-light)]" /> Phase 2 Recommended
                                            </h3>
                                            <ul className="space-y-1 text-xs text-[var(--sb-gray-300)]">
                                                {riskData.phase2Recommended.map((item) => <li key={item}>• {item}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
            </div>

            {/* Detail Modal */}
            {selectedCandidate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedCandidate(null)} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-[var(--sb-navy)]/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><User className="w-5 h-5 text-[var(--sb-violet-light)]" /> Applicant Profile</h2>
                            <button onClick={() => setSelectedCandidate(null)} className="p-2 -mr-2 text-[var(--sb-gray-400)] hover:text-white hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6">
                            <div className="flex flex-col md:flex-row gap-6 mb-8">
                                {selectedCandidate.referencePhoto ? (
                                    <img src={selectedCandidate.referencePhoto} alt="Reference" className="w-24 h-24 rounded-2xl object-cover shrink-0 border-2 border-[var(--sb-violet)] shadow-[0_0_20px_rgba(124,58,237,0.3)]" />
                                ) : (
                                    <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center font-bold text-3xl text-white shrink-0 shadow-lg">
                                        {selectedCandidate.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-2xl font-bold text-white">{selectedCandidate.name}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${selectedCandidate.qualificationStatus === 'Qualified' ? 'bg-[var(--sb-green)] text-white' : 'bg-[var(--sb-red-light)] text-white'}`}>{selectedCandidate.qualificationStatus}</span>
                                    </div>
                                    <p className="text-sm font-mono text-[var(--sb-violet-light)] mb-3">{selectedCandidate.candidateId}</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-[var(--sb-gray-300)]">
                                        <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-[var(--sb-gray-500)]" /> {selectedCandidate.email}</span>
                                        <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-[var(--sb-gray-500)]" /> {selectedCandidate.phone}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                    <p className="text-xs text-[var(--sb-gray-400)] mb-1">Score</p>
                                    <p className="text-lg font-bold text-white">{selectedCandidate.quizScore}/{selectedCandidate.quizTotal}</p>
                                </div>
                                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                    <p className="text-xs text-[var(--sb-gray-400)] mb-1">Tab Violations</p>
                                    <p className={`text-lg font-bold ${selectedCandidate.tabViolations > 3 ? "text-[var(--sb-red-light)]" : "text-white"}`}>{selectedCandidate.tabViolations}</p>
                                </div>
                                <div className="bg-[rgba(239,68,68,0.05)] rounded-xl p-4 border border-[rgba(239,68,68,0.1)]">
                                    <p className="text-xs text-[var(--sb-gray-400)] mb-1">Cam Exceptions</p>
                                    <p className={`text-lg font-bold ${(selectedCandidate.cameraViolations || 0) > 0 ? "text-[var(--sb-red-light)]" : "text-[var(--sb-green-light)]"}`}>{selectedCandidate.cameraViolations || 0}</p>
                                </div>
                                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                    <p className="text-xs text-[var(--sb-gray-400)] mb-1">Salary OK?</p>
                                    <p className="text-lg font-bold text-white">{selectedCandidate.salaryComfort ? "Yes" : "No"}</p>
                                </div>
                            </div>

                            {/* Interview Slot Info */}
                            {selectedCandidate.interviewDate && selectedCandidate.meetingLink && (
                                <div className="bg-[var(--sb-navy-mid)] border border-[var(--sb-violet)]/30 rounded-xl p-5 mb-8">
                                    <h4 className="text-sm font-semibold text-[var(--sb-gray-200)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[var(--sb-violet-light)]" /> Scheduled Interview
                                    </h4>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-white font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-[var(--sb-gray-400)]" /> {selectedCandidate.interviewDate} at {selectedCandidate.interviewTime}</p>
                                        </div>
                                        <a href={selectedCandidate.meetingLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white font-medium transition-all inline-flex items-center gap-2 shrink-0">
                                            <Video className="w-4 h-4 text-[var(--sb-violet-light)]" /> Join Meet
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
