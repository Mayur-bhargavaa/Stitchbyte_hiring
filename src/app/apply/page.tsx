"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "face-api.js";
import {
    Shield,
    CheckCircle2,
    XCircle,
    ArrowRight,
    ArrowLeft,
    Loader2,
    User,
    Mail,
    Phone,
    Send,
    Clock,
    MonitorX,
    Eye,
    CircleDot,
    Camera,
    Video,
    Target,
    Zap
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const CID_REGEX = /^SB-BDE-\d{4}$/;

// Portal Settings interface
interface PortalSettings {
    salaryFixed: string;
    salaryIncentive: string;
    minimumScore: number;
}

interface ApplyResult {
    qualified: boolean;
    scorePercent: number;
    quizScore: number;
    quizTotal: number;
    tabViolations: number;
}

interface DynamicQuestion {
    _id?: string;
    text: string;
    options: string[];
    originalOptionIndices?: number[]; // Tracks original indices after shuffling
}

interface ExamActionResponse {
    success: boolean;
    expired?: boolean;
    remainingSeconds?: number;
    error?: string;
}

function useTabMonitor(onForceDisqualify?: () => void, onViolation?: (reason: string) => void) {
    const [violations, setViolations] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const isActive = useRef(false);
    const wasHidden = useRef(false);
    const violationsRef = useRef(0);

    const start = useCallback(() => { isActive.current = true; }, []);
    const stop = useCallback(() => { isActive.current = false; }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!isActive.current) return;

            if (document.hidden) {
                wasHidden.current = true;
            } else if (wasHidden.current) {
                triggerViolation();
            }
        };

        const handleBlur = () => {
            if (!isActive.current) return;
            wasHidden.current = true; // Mark as hidden when leaving window
        };

        const handleFocus = () => {
            if (!isActive.current) return;
            if (wasHidden.current) {
                triggerViolation();
            }
        };

        const triggerViolation = () => {
            wasHidden.current = false;
            const newCount = violationsRef.current + 1;
            violationsRef.current = newCount;
            setViolations(newCount);
            onViolation?.("window_focus_changed");

            if (newCount > 3 && onForceDisqualify) {
                onForceDisqualify();
                return;
            }

            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 5000); // 5 seconds to ensure they read it
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
        };
    }, [onForceDisqualify, onViolation]);

    return { violations, showWarning, start, stop };
}

function useTimer(totalSeconds: number, onExpire: () => void) {
    const [remaining, setRemaining] = useState(totalSeconds);
    const active = useRef(false);
    const expireCb = useRef(onExpire);

    useEffect(() => {
        expireCb.current = onExpire;
    }, [onExpire]);

    const start = useCallback(() => { active.current = true; }, []);
    const stop = useCallback(() => { active.current = false; }, []);
    const syncRemaining = useCallback((seconds: number) => {
        setRemaining(Math.max(0, Math.floor(seconds)));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!active.current) return;
            setRemaining((r) => {
                if (r <= 1) {
                    active.current = false;
                    expireCb.current();
                    return 0;
                }
                return r - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const display = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    return { remaining, display, start, stop, syncRemaining };
}

// ─── CID Input Form ───────────────────────────
function CIDInputForm({ onSubmit }: { onSubmit: (cid: string) => void }) {
    const [inputCid, setInputCid] = useState("");
    const [cidError, setCidError] = useState("");
    const [validating, setValidating] = useState(false);

    const handleSubmit = async () => {
        const trimmed = inputCid.trim().toUpperCase();
        if (!trimmed) return;
        if (!/^SB-BDE-\d{4}$/.test(trimmed)) {
            setCidError("Invalid format. Your CID looks like: SB-BDE-XXXX");
            return;
        }
        setCidError("");
        setValidating(true);
        try {
            const res = await fetch(`/api/exam/validate-cid?cid=${trimmed}`);
            const data = await res.json();
            if (!data.valid) {
                setCidError(data.error || "CID validation failed.");
                setValidating(false);
                return;
            }
            onSubmit(trimmed);
        } catch {
            setCidError("Validation failed. Please try again.");
        }
        setValidating(false);
    };

    return (
        <div className="bg-black/20 rounded-xl p-5 border border-white/5 text-left">
            <label className="text-xs text-[var(--sb-gray-400)] uppercase tracking-wider font-semibold mb-2 block">Candidate ID</label>
            <div className="flex gap-3">
                <input
                    type="text"
                    value={inputCid}
                    onChange={(e) => { setInputCid(e.target.value.toUpperCase()); setCidError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="SB-BDE-0000"
                    className="flex-1 px-4 py-3 bg-[var(--sb-navy-mid)] border border-white/10 rounded-xl text-white placeholder-[var(--sb-gray-500)] text-lg font-mono tracking-wider focus:outline-none focus:border-[var(--sb-violet)] focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all"
                />
                <button
                    onClick={handleSubmit}
                    disabled={!inputCid.trim() || validating}
                    className="px-6 py-3 gradient-bg rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-2"
                >
                    {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Go
                </button>
            </div>
            {cidError && <p className="text-[var(--sb-red-light)] text-xs mt-2">{cidError}</p>}
        </div>
    );
}

function ApplyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const cid = searchParams.get("cid") || "";
    const isValidCid = CID_REGEX.test(cid);

    // Steps: 0=personal, 1=salary, 2=verification (camera), 3=quiz, 4=submitting, 5=result/review
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<ApplyResult | null>(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [salaryComfort, setSalaryComfort] = useState<null | boolean>(null);

    // Face API & Camera state
    // Face API & Camera state
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [referencePhoto, setReferencePhoto] = useState<string>("");
    const [cameraViolations, setCameraViolations] = useState(0);
    const violationsRef = useRef(0); // For immediate access in interval
    const [showFaceWarning, setShowFaceWarning] = useState("");
    const faceIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const quizStartedAtRef = useRef<number | null>(null);
    const serverExpiredRef = useRef(false);

    // Quiz state
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({}); // Changed to questionId -> optionIndex
    const [showExamStartAlert, setShowExamStartAlert] = useState(false);
    const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
    const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null);

    const buildDeviceFingerprint = useCallback(() => {
        const raw = `${navigator.userAgent}|${navigator.language}|${window.screen.width}x${window.screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
        return btoa(raw).slice(0, 80);
    }, []);

    const toFaceSignature = useCallback((detection: faceapi.FaceDetection): number[] => {
        const { x, y, width, height } = detection.box;
        const screenW = window.innerWidth || 1;
        const screenH = window.innerHeight || 1;
        return [
            Number((x / screenW).toFixed(5)),
            Number((y / screenH).toFixed(5)),
            Number((width / screenW).toFixed(5)),
            Number((height / screenH).toFixed(5)),
            Number(((width * height) / (screenW * screenH)).toFixed(5)),
            Number((detection.score || 0).toFixed(5)),
        ];
    }, []);

    const sendExamAction = useCallback(async (
        action: string,
        payload: Record<string, unknown> = {}
    ): Promise<ExamActionResponse> => {
        const response = await fetch("/api/exam/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateId: cid, action, ...payload }),
        });

        const data = await response.json();
        return data as ExamActionResponse;
    }, [cid]);

    // Shuffle array helper
    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    useEffect(() => {
        const fetchPortalData = async () => {
            const [qRes, sRes] = await Promise.all([
                fetch("/api/quiz/questions"),
                fetch("/api/admin/settings")
            ]);
            const [qData, sData] = await Promise.all([qRes.json(), sRes.json()]);
            
            if (qData.success && qData.questions) {
                // Shuffle questions order
                const shuffledQuestions = shuffleArray(qData.questions as DynamicQuestion[]);
                
                // For each question, shuffle options and track original indices
                const questionsWithShuffledOptions = shuffledQuestions.map((q) => {
                    const originalIndices = q.options.map((_, i) => i);
                    const shuffledIndices = shuffleArray(originalIndices);
                    const shuffledOptions = shuffledIndices.map(i => q.options[i]);
                    
                    return {
                        ...q,
                        options: shuffledOptions,
                        originalOptionIndices: shuffledIndices,
                    };
                });
                
                setDynamicQuestions(questionsWithShuffledOptions);
            }
            
            if (sData.success) setPortalSettings(sData.settings);
        };
        fetchPortalData();
    }, []);

    // Auto-fill form if candidate already exists in database
    useEffect(() => {
        const fetchCandidateData = async () => {
            if (!cid || !isValidCid) return;
            
            try {
                const res = await fetch(`/api/candidates/${cid}`);
                const data = await res.json();
                
                if (!data.error && data.name && data.email) {
                    // Pre-fill form with existing candidate data
                    setName(data.name || "");
                    setEmail(data.email || "");
                    setPhone(data.phone || "");
                    console.log(`✅ Auto-filled form for CID: ${cid}`);
                }
            } catch (err) {
                console.error("Error fetching candidate data:", err);
            }
        };
        
        fetchCandidateData();
    }, [cid, isValidCid]);

    // Enter full screen and block dev tools when exam starts
    useEffect(() => {
        if (step === 3) {
            setShowExamStartAlert(true);
            setTimeout(() => setShowExamStartAlert(false), 5000);

            // Block Context Menu (Right Click)
            const handleContextMenu = (e: MouseEvent) => {
                e.preventDefault();
                void sendExamAction("lockdown", {
                    fullscreen: !!document.fullscreenElement,
                    visibilityState: document.visibilityState,
                    blockedShortcuts: true,
                    clipboardBlocked: true,
                    reason: "context_menu_blocked",
                });
            };
            document.addEventListener("contextmenu", handleContextMenu);

            // Block Keyboard Shortcuts (F12, Ctrl+Shift+I, etc.)
            const handleKeyDown = (e: KeyboardEvent) => {
                if (
                    e.key === "F12" ||
                    (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "i" || e.key === "j" || e.key === "c")) ||
                    (e.ctrlKey && (e.key === "U" || e.key === "u")) ||
                    (e.metaKey && e.altKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "i" || e.key === "j" || e.key === "c")) ||
                    (e.metaKey && (e.key === "U" || e.key === "u"))
                ) {
                    e.preventDefault();
                    void sendExamAction("lockdown", {
                        fullscreen: !!document.fullscreenElement,
                        visibilityState: document.visibilityState,
                        devtoolsDetected: e.key === "F12",
                        blockedShortcuts: true,
                        reason: `shortcut_blocked:${e.key}`,
                    });
                }

                if (e.key === "PrintScreen") {
                    void sendExamAction("screen_recording", {
                        suspected: true,
                        method: "keyboard_printscreen",
                        reason: "printscreen_pressed",
                    });
                }
            };
            window.addEventListener("keydown", handleKeyDown);

            const handleFullscreenChange = () => {
                const inFullscreen = !!document.fullscreenElement;
                void sendExamAction("lockdown", {
                    fullscreen: inFullscreen,
                    visibilityState: document.visibilityState,
                    reason: inFullscreen ? "fullscreen_active" : "fullscreen_exit",
                });
            };

            const handleVisibility = () => {
                if (document.visibilityState === "hidden") {
                    void sendExamAction("screen_recording", {
                        suspected: true,
                        method: "visibility",
                        reason: "document_hidden_during_exam",
                    });
                }
            };

            document.addEventListener("fullscreenchange", handleFullscreenChange);
            document.addEventListener("visibilitychange", handleVisibility);

            return () => {
                document.removeEventListener("contextmenu", handleContextMenu);
                window.removeEventListener("keydown", handleKeyDown);
                document.removeEventListener("fullscreenchange", handleFullscreenChange);
                document.removeEventListener("visibilitychange", handleVisibility);
            };
        }
    }, [sendExamAction, step]);

    // Pass a callback to force submit if tabs > 3
    const tabMonitor = useTabMonitor(
        () => {
            setShowFaceWarning("Maximum tab switch violations exceeded. Test ended.");
            void sendExamAction("violation", { type: "tab", reason: "tab_violation_limit" });
            void sendExamAction("lockdown", {
                fullscreen: !!document.fullscreenElement,
                visibilityState: document.visibilityState,
                reason: "tab_violation_limit_exceeded",
            });
            handleSubmit(true);
        },
        (reason) => {
            void sendExamAction("violation", { type: "tab", reason });
            void sendExamAction("lockdown", {
                fullscreen: !!document.fullscreenElement,
                visibilityState: document.visibilityState,
                reason: `tab_monitor:${reason}`,
            });
        }
    );

    const [reviewDone, setReviewDone] = useState(false);
    const [reviewRemaining, setReviewRemaining] = useState(300);

    // Load Face API models
    useEffect(() => {
        if (typeof window !== "undefined") {
            faceapi.nets.tinyFaceDetector.loadFromUri('/models').then(() => {
                setModelsLoaded(true);
            }).catch(err => console.error("Could not load face-api models", err));
        }
    }, []);

    // Timer auto-submit
    const quizTimer = useTimer(1800, () => {
        handleSubmit();
    });

    // Review countdown
    useEffect(() => {
        if (!result?.qualified || reviewDone) return;
        const interval = setInterval(() => {
            setReviewRemaining((r) => {
                if (r <= 1) {
                    setReviewDone(true);
                    return 0;
                }
                return r - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [result, reviewDone]);

    // Clean up media streams
    useEffect(() => {
        return () => {
            if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mediaStream]);

    const enableCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setMediaStream(stream);
            setCameraEnabled(true);
        } catch {
            alert("Camera access is required for the assessment. Please allow camera permissions.");
        }
    };

    const captureReferencePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setReferencePhoto(dataUrl);
        }
    };

    const startQuiz = async () => {
        captureReferencePhoto();

        // Request Fullscreen on user click
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.error("Error attempting to enable fullscreen:", err));
        }

        const bootstrapDetection = videoRef.current
            ? await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            )
            : null;

        const startData = await sendExamAction("start", {
            durationSeconds: 1800,
            deviceFingerprint: buildDeviceFingerprint(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            referenceFaceDescriptor: bootstrapDetection ? toFaceSignature(bootstrapDetection) : undefined,
        });

        if (startData.expired) {
            setShowFaceWarning("Session expired on server. Please restart the assessment.");
            return;
        }

        setStep(3); // Go to quiz
        tabMonitor.start();
        quizTimer.start();
        quizStartedAtRef.current = Date.now();
        serverExpiredRef.current = false;

        if (typeof startData.remainingSeconds === "number") {
            quizTimer.syncRemaining(startData.remainingSeconds);
        }

        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(async () => {
            const heartbeat = await sendExamAction("heartbeat");
            if (typeof heartbeat.remainingSeconds === "number") {
                quizTimer.syncRemaining(heartbeat.remainingSeconds);
            }

            if (heartbeat.expired && !serverExpiredRef.current) {
                serverExpiredRef.current = true;
                setShowFaceWarning("Server timer expired. Submitting assessment.");
                handleSubmit(true);
            }
        }, 10000);

        // Start continuous ML face monitoring
        if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
        faceIntervalRef.current = setInterval(async () => {
            if (!videoRef.current) return;
            const detections = await faceapi.detectAllFaces(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            );

            if (detections.length === 0 || detections.length > 1) {
                const newCount = violationsRef.current + 1;
                violationsRef.current = newCount;
                setCameraViolations(newCount);

                void sendExamAction("violation", {
                    type: "camera",
                    reason: detections.length === 0 ? "no_face" : "multiple_faces",
                });

                if (newCount > 5) {
                    setShowFaceWarning("Maximum camera violations exceeded. Test ended.");
                    void sendExamAction("violation", { type: "camera", reason: "camera_violation_limit" });
                    handleSubmit(true); // Force disqualify
                    return;
                }

                if (detections.length === 0) {
                    setShowFaceWarning(`Face not detected! (${newCount}/5 warnings)`);
                } else {
                    setShowFaceWarning(`Multiple faces detected! (${newCount}/5 warnings)`);
                }
                setTimeout(() => setShowFaceWarning(""), 4000);
            } else {
                const descriptor = toFaceSignature(detections[0]);
                void sendExamAction("biometric", {
                    descriptor,
                    source: "tiny_face_signature",
                });
            }
        }, 5000); // Check every 5 seconds
    };

    const handleSubmit = async (forceDisqualify = false) => {
        tabMonitor.stop();
        quizTimer.stop();
        if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

        // Stop camera
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }

        setSubmitting(true);
        setStep(4);

        try {
            const examDuration = quizStartedAtRef.current
                ? Math.max(0, Math.floor((Date.now() - quizStartedAtRef.current) / 1000))
                : undefined;

            await sendExamAction("complete", {
                duration: examDuration,
            });

            const res = await fetch("/api/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateId: cid,
                    name,
                    email,
                    phone,
                    salaryComfort,
                    answers,
                    tabViolations: tabMonitor.violations,
                    cameraViolations: violationsRef.current,
                    referencePhoto,
                    forceDisqualify,
                    examDuration,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResult({
                qualified: data.qualified,
                scorePercent: data.scorePercent,
                quizScore: data.quizScore,
                quizTotal: data.quizTotal,
                tabViolations: data.tabViolations,
            });
            setStep(5);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to submit assessment.";
            alert(message);
            router.push("/");
        }
        setSubmitting(false);
    };

    if (!isValidCid) {
        return (
            <div className="h-screen w-full bg-[#050505] overflow-hidden flex flex-col md:flex-row text-white relative selection:bg-violet-500 selection:text-white">
                <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--sb-violet)] opacity-[0.05] blur-[120px] pointer-events-none z-0" />

                <div className="relative z-10 w-full md:w-1/2 h-[100dvh] flex flex-col justify-center px-8 md:px-16 lg:px-24 pt-12 md:pt-0">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl">
                        <div className="flex items-center gap-3 mb-10">
                            <Image src="/logo-stitchbyte.png" alt="Stitchbyte Logo" width={160} height={32} className="h-8 w-auto" priority />
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-medium text-white/70 uppercase tracking-widest mb-6">
                            <span className="w-2 h-2 rounded-full bg-[var(--sb-violet)] animate-pulse"></span>
                            Assessment Access
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-[1.1] mb-4">Enter your <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Candidate ID</span></h1>
                        <p className="text-base text-white/50 leading-relaxed mb-8 max-w-md font-light">Use the CID from your email to unlock your proctored assessment session.</p>
                        <CIDInputForm onSubmit={(newCid) => router.replace(`/apply?cid=${newCid}`)} />
                        <p className="text-[11px] text-white/40 mt-4 ml-1">Need help? contact <a href="mailto:info@stitchbyte.in" className="text-white/70 hover:text-white underline underline-offset-2">info@stitchbyte.in</a></p>
                    </motion.div>
                </div>

                <div className="relative z-10 w-full md:w-1/2 h-[100dvh] hidden md:flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-black/40 border-l border-white/5 backdrop-blur-xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-4 w-full max-w-lg mx-auto">
                        <div className="col-span-2 bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                            <Target className="w-6 h-6 text-[var(--sb-violet-light)] mb-4" />
                            <h3 className="text-2xl font-bold mb-1">30 Questions</h3>
                            <p className="text-sm text-white/50 font-light">Scenario-based sales questions and integrity checks.</p>
                        </div>
                        <div className="col-span-1 bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between aspect-square">
                            <Clock className="w-6 h-6 text-white/70" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">30 Mins</h3>
                                <p className="text-xs text-white/50">Server-authoritative exam timer.</p>
                            </div>
                        </div>
                        <div className="col-span-1 bg-[var(--sb-violet)]/10 border border-[var(--sb-violet)]/20 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between aspect-square relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--sb-violet)]/30 rounded-full blur-2xl"></div>
                            <Shield className="w-6 h-6 text-[var(--sb-violet-light)] relative z-10" />
                            <div className="relative z-10">
                                <h3 className="text-lg font-semibold mb-1 text-[var(--sb-violet-light)]">Proctored</h3>
                                <p className="text-xs text-white/60">Face and tab monitoring enabled.</p>
                            </div>
                        </div>
                        <div className="col-span-2 bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-md flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold mb-1">Freshers Welcome</h3>
                                <p className="text-xs text-white/50 font-light">Skill-first shortlisting with fast turnaround.</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                <Zap className="w-4 h-4 text-white/70" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (salaryComfort === false && step === 1) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
                        <Image src="/logo-stitchbyte.png" alt="Stitchbyte Logo" width={160} height={32} className="h-8 w-auto" priority />
                    </div>
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--sb-violet)]/20 border border-[var(--sb-violet)]/30 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-[var(--sb-violet-light)] shadow-[0_0_15px_var(--sb-violet)]" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Thank You</h1>
                    <p style={{ color: "var(--sb-gray-300)" }} className="mb-6">We appreciate your honesty. We&apos;ll keep your information on file.</p>
                    <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass-surface hover:bg-white/5 transition-all text-white font-medium">
                        <ArrowLeft className="w-4 h-4" /> Home
                    </Link>
                </motion.div>
            </div>
        );
    }

    if (step === 4 && submitting) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[var(--sb-violet)] mx-auto mb-4" />
                    <p className="text-lg font-medium text-white">Evaluating responses...</p>
                </div>
            </div>
        );
    }

    if (step === 5 && result) {
        const reviewMins = Math.floor(reviewRemaining / 60);
        const reviewSecs = reviewRemaining % 60;
        return (
            <div className="min-h-screen flex items-center justify-center px-6 py-12">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 md:p-12 max-w-lg w-full text-center">
                    {result.qualified ? (
                        <>
                            <CheckCircle2 className="w-16 h-16 text-white bg-[var(--sb-green)] rounded-full p-2 mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
                            <h1 className="text-3xl font-bold text-white mb-2">Test <span className="gradient-text">Passed!</span></h1>
                            <p className="text-sm mb-4" style={{ color: "var(--sb-gray-300)" }}>Score: {result.quizScore}/{result.quizTotal} ({result.scorePercent}%)</p>
                            {!reviewDone ? (
                                <div className="mt-6 glass-surface p-6">
                                    <div className="flex items-center justify-center gap-2 mb-3"><Eye className="w-5 h-5 text-[var(--sb-teal)]" /><span className="font-semibold text-white">Integrity Review In Progress</span></div>
                                    <p className="text-sm text-[var(--sb-gray-400)] mb-4">Verifying tab activity, camera feed, and response patterns.</p>
                                    <div className="text-4xl font-mono text-white mb-2">{reviewMins.toString().padStart(2, "0")}:{reviewSecs.toString().padStart(2, "0")}</div>
                                    <div className="w-full h-1.5 rounded-full mt-4 bg-[var(--sb-navy-mid)]">
                                        <motion.div className="h-full rounded-full gradient-bg" style={{ width: `${((300 - reviewRemaining) / 300) * 100}%` }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-6">
                                    <p className="font-semibold text-[var(--sb-green-light)] mb-4">Review Complete — You&apos;re Cleared!</p>
                                    <Link href={`/book?cid=${cid}`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-bg text-white font-semibold text-lg hover:opacity-90 transition-all">
                                        Proceed to Booking <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <XCircle className="w-16 h-16 text-[var(--sb-amber-light)] bg-white/10 rounded-full p-2 mx-auto mb-6" />
                            <h1 className="text-3xl font-bold text-white mb-2">Test Failed</h1>
                            <p className="text-sm text-[var(--sb-gray-300)] mb-4">Score: {result.quizScore}/{result.quizTotal} ({result.scorePercent}%)</p>
                            <p className="text-[var(--sb-gray-300)] mb-4">
                                {(result.tabViolations > 3 || cameraViolations > 5)
                                    ? "Your assessment was flagged and automatically terminated due to excessive integrity violations (tab switching or face not detected 5+ times)."
                                    : "Unfortunately, your score didn't meet the minimum threshold. We will reach out if a better-suited role opens up."}
                            </p>
                            <Link href="/" className="inline-block px-6 py-3 rounded-xl glass-surface text-white font-medium">Back to Home</Link>
                        </>
                    )}
                </motion.div>
            </div>
        );
    }

    const currentQuestion = dynamicQuestions?.[currentQ];

    return (
        <div className="h-screen w-full bg-[#050505] overflow-hidden text-white relative selection:bg-violet-500 selection:text-white flex flex-col">
            <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--sb-violet)] opacity-[0.05] blur-[120px] pointer-events-none z-0" />
            {mediaStream && (
                <video
                    autoPlay playsInline muted
                    className="fixed top-0 left-0 w-10 h-10 opacity-0 pointer-events-none -z-50"
                    ref={(el) => {
                        videoRef.current = el;
                        if (el && el.srcObject !== mediaStream) el.srcObject = mediaStream;
                    }}
                />
            )}
            {step === 3 && name && email && (
                <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden flex flex-wrap items-center justify-center opacity-[0.03] select-none" style={{ gap: '4rem', transform: 'rotate(-25deg) scale(1.5)' }}>
                    {Array.from({ length: 60 }).map((_, i) => (
                        <span key={i} className="text-2xl font-bold whitespace-nowrap text-white">{name} • {email}</span>
                    ))}
                </div>
            )}
            <AnimatePresence>
                {showExamStartAlert && (
                    <motion.div initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl flex items-center gap-3 bg-[var(--sb-violet)] shadow-[0_8px_30px_rgba(124,58,237,0.4)]">
                        <Shield className="w-5 h-5 text-white shrink-0" />
                        <div>
                            <p className="text-white font-semibold text-sm">Exam Started in Fullscreen Mode</p>
                            <p className="text-white/80 text-xs">Right-click and developer tools are now disabled.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showFaceWarning && (
                    <motion.div initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }} className="fixed top-4 right-4 z-50 px-6 py-4 rounded-xl flex items-center gap-3 bg-[rgba(245,158,11,0.95)] shadow-[0_8px_30px_rgba(245,158,11,0.4)]">
                        <Video className="w-5 h-5 text-white shrink-0" />
                        <div>
                            <p className="text-white font-semibold text-sm">Camera Integrity Alert!</p>
                            <p className="text-white/90 text-xs">{showFaceWarning}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {tabMonitor.showWarning && (
                    <motion.div
                        initial={{ opacity: 0, y: -60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -60 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl flex items-center gap-3 bg-[rgba(239,68,68,0.95)] shadow-[0_8px_30px_rgba(239,68,68,0.4)]"
                    >
                        <MonitorX className="w-5 h-5 text-white shrink-0" />
                        <div>
                            <p className="text-white font-semibold text-sm">Tab Switch Detected!</p>
                            <p className="text-white/80 text-xs">Violation {tabMonitor.violations}/3 — Exceeding 3 will disqualify you.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Image src="/logo-stitchbyte.png" alt="Stitchbyte Logo" width={160} height={32} className="h-7 w-auto" priority />
                </div>
                <div className="flex items-center gap-4">
                    {step === 3 && (
                        <>
                            <div className="flex items-center gap-2 text-sm text-[var(--sb-gray-400)]">
                                <Video className="w-4 h-4" />
                                <span style={{ color: cameraViolations > 3 ? "var(--sb-amber-light)" : "" }}>{cameraViolations}/5 cam</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[var(--sb-gray-400)]">
                                <MonitorX className="w-4 h-4" />
                                <span style={{ color: tabMonitor.violations > 2 ? "var(--sb-red-light)" : "" }}>{tabMonitor.violations}/3 tabs</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-surface">
                                <Clock className="w-4 h-4 text-[var(--sb-teal)]" />
                                <span className="font-mono text-sm text-white">{quizTimer.display}</span>
                            </div>
                        </>
                    )}
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--sb-gray-400)]">
                        <Shield className="w-3 h-3 text-[var(--sb-green)]" /> {cid}
                    </div>
                </div>
            </header>

            {/* Progress */}
            <div className="relative z-10 px-6 pt-4">
                <div className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-3 mb-3">
                    {["Personal", "Salary", "Verification", "Quiz"].map((label, i) => (
                        <div key={label} className="flex items-center gap-2">
                            <div
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                style={{
                                    background: i <= step ? "linear-gradient(135deg, var(--sb-violet), var(--sb-teal))" : "var(--sb-navy-mid)",
                                    color: i <= step ? "white" : "var(--sb-gray-400)",
                                }}
                            >
                                {i < step ? "✓" : i + 1}
                            </div>
                            <span className="text-xs font-medium hidden sm:inline" style={{ color: i <= step ? "white" : "var(--sb-gray-500)" }}>{label}</span>
                            {i < 3 && <div className="w-4 sm:w-8 h-px bg-[var(--sb-glass-border)] mx-1" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Forms */}
            <div className="relative z-10 flex-1 px-6 py-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">

                        {/* Step 0: Personal */}
                        {step === 0 && (
                            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h2 className="text-2xl font-bold text-white mb-6">Your Details</h2>
                                {/* {cid && isValidCid && name && (
                                    <div className="mb-4 p-3 rounded-lg bg-[var(--sb-violet)]/10 border border-[var(--sb-violet)]/20">
                                        <p className="text-xs text-[var(--sb-violet-light)] font-semibold">✓ Form auto-filled from CID: {cid}</p>
                                    </div>
                                )} */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-[var(--sb-gray-200)]"><User className="w-4 h-4 text-[var(--sb-violet-light)]" /> Full Name</label>
                                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-[var(--sb-gray-200)]"><Mail className="w-4 h-4 text-[var(--sb-violet-light)]" /> Email</label>
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-[var(--sb-gray-200)]"><Phone className="w-4 h-4 text-[var(--sb-violet-light)]" /> Phone</label>
                                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex justify-end mt-8">
                                    <button onClick={() => setStep(1)} disabled={!name || !email || !phone} className="px-6 py-3 rounded-xl gradient-bg text-white font-semibold disabled:opacity-40 flex items-center gap-2">
                                        Continue <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 1: Salary Gate */}
                        {step === 1 && (
                            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-10 text-center max-w-lg mx-auto">
                                <h2 className="text-2xl font-bold text-white mb-4">Before We Begin</h2>
                                <p className="mb-6 text-[var(--sb-gray-300)]">This role offers <span className="text-white font-semibold">{portalSettings?.salaryFixed || "₹5,000"} fixed monthly pay</span> + <span className="text-white font-semibold">performance-based incentives</span>.</p>
                                <div className="glass-surface p-4 mb-6">
                                    <p className="text-sm text-[var(--sb-gray-400)]">Top performers earn <span className="text-[var(--sb-green-light)] font-semibold">{portalSettings?.salaryIncentive || "₹30,000 - ₹45,000"}/month</span> through incentives.</p>
                                </div>
                                <p className="text-lg font-medium text-white mb-6">Are you comfortable with this structure?</p>
                                <div className="flex gap-4 justify-center">
                                    <button onClick={() => { setSalaryComfort(true); setStep(2); }} className="px-6 py-3 rounded-xl gradient-bg text-white font-semibold">Yes, I&apos;m In</button>
                                    <button onClick={() => setSalaryComfort(false)} className="px-6 py-3 rounded-xl glass-surface font-semibold text-white">Not For Me</button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Verification (Camera ML) */}
                        {step === 2 && (
                            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6 md:p-8 text-center max-w-2xl mx-auto">
                                <Camera className="w-10 h-10 text-[var(--sb-violet)] mx-auto mb-3" />
                                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Camera Identity Check</h2>
                                <p className="text-xs md:text-sm text-[var(--sb-gray-300)] mb-4">
                                    To ensure the integrity of this assessment, your camera will be active. AI will monitor for multiple faces or if you leave the frame.
                                </p>

                                <div className="bg-slate-950 rounded-2xl w-full max-h-[50vh] aspect-video overflow-hidden relative mb-4 border border-white/10 flex items-center justify-center">
                                    <video autoPlay playsInline muted ref={(el) => { if (el && el.srcObject !== mediaStream) el.srcObject = mediaStream; }} className={`w-full h-full object-cover ${cameraEnabled ? 'opacity-100' : 'opacity-0'}`} />
                                    <canvas ref={canvasRef} className="hidden" />
                                    {!cameraEnabled && (
                                        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 to-slate-950/60 flex items-end justify-center pb-8">
                                            <button onClick={enableCamera} className="z-10 px-8 py-3 rounded-full gradient-bg text-white text-base font-semibold flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                                                <Camera className="w-5 h-5" />
                                                Enable Camera
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {cameraEnabled && !modelsLoaded && (
                                    <p className="text-sm text-[var(--sb-amber-light)] mb-4 animate-pulse">Loading AI models...</p>
                                )}

                                <button
                                    onClick={startQuiz}
                                    disabled={!cameraEnabled || !modelsLoaded}
                                    className="w-full py-3 md:py-4 rounded-xl gradient-bg text-white font-semibold text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Confirm Identity & Start Quiz <ArrowRight className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}

                        {/* Step 3: Quiz */}
                        {step === 3 && currentQuestion && (
                            <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                {/* Fixed position floating camera preview */}
                                <div className="fixed bottom-4 right-4 w-32 aspect-square md:w-48 md:aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.4)] z-40 bg-black/90 backdrop-blur-md">
                                    <video autoPlay playsInline muted ref={(el) => { if (el && el.srcObject !== mediaStream) el.srcObject = mediaStream; }} className="w-full h-full object-cover scale-x-[-1]" />
                                </div>

                                <div className="flex items-center justify-between mb-4 text-xs uppercase tracking-wider text-white/60 font-semibold">
                                    <span>Question {currentQ + 1} of {dynamicQuestions.length}</span>
                                    <span>Answered: {Object.keys(answers).length}/{dynamicQuestions.length}</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full mb-8 bg-white/10">
                                    <div className="h-full rounded-full gradient-bg transition-all duration-300" style={{ width: `${((currentQ + 1) / (dynamicQuestions.length || 1)) * 100}%` }} />
                                </div>

                                <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 mb-6 backdrop-blur-md">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-medium text-white/70 uppercase tracking-widest mb-5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--sb-violet)]"></span>
                                        Assessment Question
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-white mb-6">Q{currentQ + 1}. {currentQuestion.text}</h3>
                                    <div className="space-y-3">
                                        {currentQuestion.options.map((opt: string, i: number) => {
                                            const questionId = currentQuestion._id || String(currentQ);
                                            const sel = answers[questionId] === i;
                                            return (
                                                <button key={i} onClick={() => setAnswers((v) => ({ ...v, [questionId]: i }))}
                                                    className="w-full text-left p-4 rounded-2xl flex items-start gap-3 transition-all hover:border-white/20"
                                                    style={{
                                                        background: sel ? "linear-gradient(135deg, rgba(124,58,237,0.24), rgba(6,182,212,0.18))" : "rgba(255,255,255,0.03)",
                                                        border: `1px solid ${sel ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.12)"}`,
                                                        color: sel ? "white" : "rgba(255,255,255,0.88)",
                                                    }}
                                                >
                                                    <CircleDot className="w-5 h-5 shrink-0 mt-0.5" style={{ color: sel ? "var(--sb-violet-light)" : "var(--sb-gray-500)" }} />
                                                    <span className="text-sm">{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Question Navigator Dashboard */}
                                <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 mb-6 backdrop-blur-md">
                                    <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Question Navigator</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {dynamicQuestions.map((q, idx: number) => {
                                            const questionId = q._id || String(idx);
                                            const isAnswered = answers[questionId] !== undefined;
                                            const isCurrent = idx === currentQ;
                                            return (
                                                <button
                                                    key={q._id || idx}
                                                    onClick={() => setCurrentQ(idx)}
                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${isCurrent ? "bg-[var(--sb-violet)] text-white shadow-lg ring-2 ring-[var(--sb-violet-light)]" :
                                                        isAnswered ? "bg-[rgba(16,185,129,0.2)] text-[var(--sb-green-light)] border border-[rgba(16,185,129,0.3)] hover:bg-[rgba(16,185,129,0.3)]" :
                                                            "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                                                        }`}
                                                >
                                                    {idx + 1}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white disabled:opacity-30 flex items-center gap-2 hover:bg-white/10 transition-all"><ArrowLeft className="w-4 h-4" /> Prev</button>
                                    {currentQ < dynamicQuestions.length - 1 ? (
                                        <button onClick={() => setCurrentQ(curr => curr + 1)} className="px-6 py-3 rounded-full bg-white text-black font-semibold flex items-center gap-2 hover:scale-[1.02] transition-transform">Next <ArrowRight className="w-4 h-4" /></button>
                                    ) : (
                                        <button onClick={() => handleSubmit()} className="px-6 py-3 rounded-full bg-white text-black font-semibold flex items-center gap-2 hover:scale-[1.02] transition-transform"><Send className="w-4 h-4" /> Submit</button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default function ApplyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <ApplyContent />
        </Suspense>
    );
}
