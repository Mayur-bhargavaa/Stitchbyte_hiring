"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Calendar, Loader2, ArrowLeft, CheckCircle2, XCircle, Video, Sparkles, TimerReset } from "lucide-react";
import Link from "next/link";

// Helper to format dates for display
const displayDateInfo = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

// Check if today is the interview day
const isInterviewDay = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return todayStr === dateStr;
};

// Calculate days until interview
const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + "T00:00:00");
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
};

interface CandidateData {
    name: string;
    qualificationStatus: string;
    interviewDate?: string;
    interviewTime?: string;
    meetingLink?: string;
}

function BookContent() {
    const searchParams = useSearchParams();
    const cid = searchParams.get("cid");

    const [loading, setLoading] = useState(true);
    const [candidate, setCandidate] = useState<CandidateData | null>(null);
    const [error, setError] = useState("");

    // Scheduling State
    const [allSlots, setAllSlots] = useState<string[]>([]);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [assignedDate, setAssignedDate] = useState<string>("");
    const [selectedTime, setSelectedTime] = useState<string>("");
    const [booking, setBooking] = useState(false);
    const [confirmedSlot, setConfirmedSlot] = useState<{ date: string, time: string, link: string } | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);

    const fetchSlotsForDate = async (date: string) => {
        try {
            const slotsRes = await fetch(`/api/book/slots?date=${date}`);
            const slotsData = await slotsRes.json();
            if (slotsData.success) {
                setAllSlots(slotsData.allSlots);
                setBookedSlots(slotsData.bookedSlots);
                setAssignedDate(slotsData.assignedDate);
                if (!availableDates.length) {
                    setAvailableDates(slotsData.availableDates || []);
                }
            }
        } catch {
            setError("Failed to load slots");
        }
    };

    useEffect(() => {
        if (!cid) {
            setError("Missing Candidate ID");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const candRes = await fetch(`/api/candidates/${cid}`);
                const candData = await candRes.json();
                if (candData.error) throw new Error(candData.error);
                setCandidate(candData);

                if (candData.meetingLink && !isRescheduling) {
                    setConfirmedSlot({
                        date: candData.interviewDate,
                        time: candData.interviewTime,
                        link: candData.meetingLink
                    });
                    // Also fetch available dates for reschedule option
                    const slotsRes = await fetch('/api/book/slots');
                    const slotsData = await slotsRes.json();
                    if (slotsData.success) {
                        setAvailableDates(slotsData.availableDates || []);
                    }
                } else if (candData.qualificationStatus === "Qualified") {
                    const slotsRes = await fetch('/api/book/slots');
                    const slotsData = await slotsRes.json();
                    if (slotsData.success) {
                        setAllSlots(slotsData.allSlots);
                        setBookedSlots(slotsData.bookedSlots);
                        setAssignedDate(slotsData.assignedDate);
                        setAvailableDates(slotsData.availableDates || []);
                    }
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Failed to load booking data";
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [cid, isRescheduling]);

    const handleDateChange = async (date: string) => {
        setSelectedTime("");
        await fetchSlotsForDate(date);
    };

    const handleBookSlot = async () => {
        if (!assignedDate || !selectedTime) return;
        setBooking(true);
        setError("");

        try {
            const res = await fetch("/api/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateId: cid,
                    date: assignedDate,
                    time: selectedTime,
                    reschedule: isRescheduling,
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setConfirmedSlot({
                date: data.interviewDate,
                time: data.interviewTime,
                link: data.meetingLink
            });
            setIsRescheduling(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to book slot";
            setError(message);
        } finally {
            setBooking(false);
        }
    };

    const startReschedule = () => {
        setConfirmedSlot(null);
        setIsRescheduling(true);
        setSelectedTime("");
        setError("");
    };

    // ─── Loading ───
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[var(--sb-violet)] animate-spin" />
                    <p className="text-[var(--sb-gray-300)] text-sm">Loading your portal...</p>
                </motion.div>
            </div>
        );
    }

    // ─── No CID or Error ───
    if (!cid || (error && !candidate)) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 max-w-md w-full text-center">
                    <XCircle className="w-12 h-12 text-[var(--sb-red-light)] mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Access Error</h1>
                    <p className="text-[var(--sb-gray-300)] mb-6">{error || "No Candidate ID provided."}</p>
                    <p className="text-[var(--sb-gray-400)] text-sm mb-6">Please use the link from your qualification email, or enter your CID on the assessment page.</p>
                    <Link href="/apply" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass-surface text-white hover:bg-white/5 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Go to Assessment Portal
                    </Link>
                </motion.div>
            </div>
        );
    }

    // ─── Not Qualified ───
    if (candidate && candidate.qualificationStatus !== "Qualified") {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 max-w-md w-full text-center">
                    <XCircle className="w-12 h-12 text-[var(--sb-red-light)] mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-[var(--sb-gray-300)] mb-6">This portal is only available for qualified candidates.</p>
                    <p className="text-[var(--sb-gray-400)] text-xs">For support: <a href="mailto:info@stitchbyte.in" className="text-[var(--sb-violet)] hover:underline">info@stitchbyte.in</a></p>
                </motion.div>
            </div>
        );
    }

    // ─── Calculate interview day status ───
    const daysUntil = confirmedSlot ? getDaysUntil(confirmedSlot.date) : 999;
    const isToday = confirmedSlot ? isInterviewDay(confirmedSlot.date) : false;
    const isPast = daysUntil < 0;

    // ─── Main Content ───
    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[var(--sb-violet)] rounded-full opacity-[0.04] blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-cyan-500 rounded-full opacity-[0.03] blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass-card p-8 md:p-10 max-w-xl w-full text-center relative z-10"
            >
                {/* Header */}
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {confirmedSlot ? "Interview Portal" : "Book Your Interview"}
                </h1>
                <p className="text-[var(--sb-gray-300)] text-sm mb-8">
                    {confirmedSlot
                        ? `Welcome back, ${candidate?.name}!`
                        : <>Congratulations, <strong className="text-white">{candidate?.name}</strong>! You&apos;ve passed the assessment.</>
                    }
                </p>

                <AnimatePresence mode="wait">
                    {confirmedSlot ? (
                        // ─── CONFIRMED STATE ───
                        <motion.div
                            key="confirmed"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-black/30 border border-white/5 rounded-2xl p-6 md:p-8"
                        >
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--sb-violet)]/10 flex items-center justify-center">
                                <Video className="w-6 h-6 text-[var(--sb-violet-light)]" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">Interview Confirmed!</h2>
                            <p className="text-[var(--sb-gray-400)] text-sm mb-6">Your 1:1 founder interview has been scheduled.</p>

                            {/* Details Card */}
                            <div className="bg-black/40 rounded-xl p-5 mb-6 border border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <Calendar className="w-4 h-4 text-[var(--sb-violet-light)]" />
                                    <span className="text-white font-medium">{displayDateInfo(confirmedSlot.date)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-cyan-400" />
                                    <span className="text-white font-medium">{confirmedSlot.time}</span>
                                </div>
                            </div>

                            {/* Conditional Join / Countdown */}
                            {isToday || isPast ? (
                                <a
                                    href={confirmedSlot.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-4 rounded-xl gradient-bg text-white font-bold text-lg shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.6)] transition-all flex items-center justify-center gap-2"
                                >
                                    <Video className="w-5 h-5" /> Join Stitchbyte Meet
                                </a>
                            ) : (
                                <div className="bg-[var(--sb-navy-mid)] border border-white/5 rounded-xl p-5">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <TimerReset className="w-5 h-5 text-amber-400" />
                                        <span className="text-amber-400 font-semibold text-sm uppercase tracking-wider">Meeting Not Yet Open</span>
                                    </div>
                                    <p className="text-[var(--sb-gray-300)] text-sm">
                                        Your meeting room will open on <strong className="text-white">{displayDateInfo(confirmedSlot.date)}</strong>.
                                    </p>
                                    <p className="text-[var(--sb-gray-400)] text-xs mt-2">
                                        {daysUntil === 1 ? "That's tomorrow!" : `${daysUntil} days to go`} — The link will activate 5 minutes before your slot.
                                    </p>
                                </div>
                            )}

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                                <p className="text-blue-300 text-xs font-medium">📋 Details saved to your account</p>
                                <p className="text-blue-200/70 text-xs mt-1">Your interview details are stored securely. Download or screenshot this information for your records.</p>
                            </div>

                            <p className="text-[var(--sb-gray-500)] text-xs mt-3">
                                💬 If you don&apos;t receive a confirmation email, contact <a href="mailto:info@stitchbyte.in" className="text-[var(--sb-violet)] hover:underline">info@stitchbyte.in</a>
                            </p>
                            {availableDates.length > 0 && (
                                <button
                                    onClick={startReschedule}
                                    className="mt-4 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--sb-gray-300)] text-sm font-medium hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 mx-auto"
                                >
                                    <Calendar className="w-4 h-4" /> Change Date / Reschedule
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        // ─── SCHEDULING STATE ───
                        <motion.div
                            key="scheduling"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-black/30 border border-white/5 rounded-2xl p-6 md:p-8 text-left"
                        >
                            {isRescheduling && (
                                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <TimerReset className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span className="text-amber-300 text-xs font-medium">Rescheduling your interview. Pick a new date and time below.</span>
                                </div>
                            )}

                            {availableDates.length === 0 ? (
                                <div className="text-center py-8">
                                    <Calendar className="w-10 h-10 text-[var(--sb-gray-500)] mx-auto mb-3" />
                                    <p className="text-white font-medium mb-1">No Interview Dates Available</p>
                                    <p className="text-sm text-[var(--sb-gray-400)]">The admin has not configured any upcoming interview dates. Please check back later.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Date Selection */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        <h3 className="text-xs font-semibold text-[var(--sb-gray-200)] uppercase tracking-wider">Select Interview Date</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-7">
                                        {availableDates.map((d: string) => {
                                            const isSelected = assignedDate === d;
                                            return (
                                                <motion.button
                                                    key={d}
                                                    onClick={() => handleDateChange(d)}
                                                    whileHover={{ scale: 1.03 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    className={`p-3.5 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                                                        isSelected
                                                            ? "bg-[var(--sb-violet)] border-[var(--sb-violet-light)] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                                                            : "bg-[var(--sb-navy-mid)] border-white/5 text-[var(--sb-gray-300)] hover:bg-white/10 hover:border-white/10"
                                                    }`}
                                                >
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span className="text-xs">{displayDateInfo(d)}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    {/* Assigned Date Display */}
                                    {assignedDate && (
                                        <>
                                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[var(--sb-violet)]/10 to-transparent border border-[var(--sb-violet)]/20 rounded-xl mb-7 shadow-inner">
                                                <Calendar className="w-5 h-5 text-[var(--sb-violet-light)]" />
                                                <span className="text-white font-medium text-lg">{displayDateInfo(assignedDate)}</span>
                                            </div>

                                            {/* Time Slots */}
                                            <h3 className="text-xs font-semibold text-[var(--sb-gray-200)] uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Select Your Time Slot
                                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                                {allSlots.map((time: string) => {
                                    const isBooked = bookedSlots.includes(time);
                                    const isSelected = selectedTime === time;

                                    return (
                                        <motion.button
                                            key={time}
                                            disabled={isBooked}
                                            onClick={() => setSelectedTime(time)}
                                            whileHover={!isBooked ? { scale: 1.03 } : {}}
                                            whileTap={!isBooked ? { scale: 0.97 } : {}}
                                            className={`p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${isBooked
                                                    ? "bg-black/20 border-white/5 text-white/20 cursor-not-allowed"
                                                    : isSelected
                                                        ? "bg-[var(--sb-violet)] border-[var(--sb-violet-light)] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                                                        : "bg-[var(--sb-navy-mid)] border-white/5 text-[var(--sb-gray-300)] hover:bg-white/10 hover:border-white/10"
                                                }`}
                                        >
                                            <Clock className={`w-3.5 h-3.5 ${isBooked ? 'opacity-20' : ''}`} /> {time}
                                            {isBooked && <span className="text-[10px] uppercase block ml-1 text-[var(--sb-red-light)] opacity-70">Taken</span>}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-[var(--sb-red-light)] text-sm mb-4 p-3 bg-[rgba(239,68,68,0.1)] rounded-lg border border-[rgba(239,68,68,0.2)] flex items-center gap-2"
                                >
                                    <XCircle className="w-4 h-4 shrink-0" /> {error}
                                </motion.p>
                            )}

                            <button
                                onClick={handleBookSlot}
                                disabled={!selectedTime || !assignedDate || booking}
                                className="w-full py-4 rounded-xl gradient-bg text-white font-bold text-lg shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> {isRescheduling ? "Confirm Reschedule" : "Confirm Interview Slot"}</>}
                            </button>

                                        </>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

// ─── Page Export ────────────────────────────────
export default function BookPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--sb-violet)] animate-spin" />
            </div>
        }>
            <BookContent />
        </Suspense>
    );
}
