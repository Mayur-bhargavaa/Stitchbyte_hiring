"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Zap, Target, Clock, Shield, XCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

export default function Home() {
  const [examEnabled, setExamEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/exam/status")
      .then((res) => res.json())
      .then((data) => setExamEnabled(data.examEnabled !== false))
      .catch(() => setExamEnabled(true));
  }, []);

  return (
    <div className="h-screen w-full bg-[#050505] overflow-hidden flex flex-col md:flex-row text-white selection:bg-violet-500 selection:text-white">
      {/* Background Grid Pattern (Subtle) */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>

      {/* Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--sb-violet)] opacity-[0.05] blur-[120px] pointer-events-none z-0"></div>

      {/* Left Column: Hero Text */}
      <div className="relative z-10 w-full md:w-1/2 h-[100dvh] flex flex-col justify-center px-8 md:px-16 lg:px-24 pt-12 md:pt-0">
        <motion.div initial="hidden" animate="visible" className="max-w-xl">
          <motion.div custom={0} variants={fadeUp} className="flex items-center gap-3 mb-10">
            <Image src="/logo-stitchbyte.png" alt="Stitchbyte Logo" width={160} height={32} className="h-8 w-auto" priority />
          </motion.div>

          <motion.div custom={1} variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-medium text-white/70 uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--sb-violet)] animate-pulse"></span>
              Hiring Portal
            </div>
          </motion.div>

          <motion.h1 custom={2} variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1] mb-6 font-sans">
            Scale your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">career in sales.</span>
          </motion.h1>

          <motion.p custom={3} variants={fadeUp} className="text-base md:text-lg text-white/50 leading-relaxed mb-10 max-w-md font-light">
            Take the Business Development Executive Assessment. Prove your skills, skip the traditional resume screen, and land a role at Stitchbyte.
          </motion.p>

          <motion.div custom={4} variants={fadeUp}>
            {examEnabled === null ? (
              <div className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 text-white/50 text-base font-semibold">
                Loading...
              </div>
            ) : examEnabled ? (
              <Link href="/apply" className="group relative inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-full text-base font-semibold hover:scale-[1.02] transition-transform duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                Start Assessment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-base font-semibold">
                  <XCircle className="w-5 h-5" />
                  Exam Unavailable
                </div>
                <p className="text-sm text-white/40 ml-2">Sorry, the assessment is currently closed. Please check back later or contact admin.</p>
              </div>
            )}
            {examEnabled && <p className="text-[11px] text-white/40 mt-4 ml-2">Requires Candidate ID from your email.</p>}
          </motion.div>
        </motion.div>

        {/* Footer info absolute to left column */}
        <div className="absolute bottom-6 left-8 md:left-16 lg:left-24">
          <span className="text-[11px] text-white/30">© {new Date().getFullYear()} Stitchbyte Technologies</span>
        </div>
      </div>

      {/* Right Column: Bento Grid */}
      <div className="relative z-10 w-full md:w-1/2 h-[100dvh] hidden md:flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-black/40 border-l border-white/5 backdrop-blur-xl">
        <motion.div initial="hidden" animate="visible" className="grid grid-cols-2 gap-4 w-full max-w-lg mx-auto">

          {/* Bento Box 1: Comp */}
          <motion.div custom={2} variants={fadeUp} className="col-span-2 bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-md hover:border-white/20 transition-colors">
            <Target className="w-6 h-6 text-[var(--sb-violet-light)] mb-4" />
            <h3 className="text-2xl font-bold mb-1">₹5K + ₹45K</h3>
            <p className="text-sm text-white/50 font-light">Fixed baseline with uncapped incentive potential.</p>
          </motion.div>

          {/* Bento Box 2: Rule 1 */}
          <motion.div custom={3} variants={fadeUp} className="col-span-1 bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-md hover:border-white/20 transition-colors flex flex-col justify-between aspect-square">
            <Clock className="w-6 h-6 text-white/70" />
            <div>
              <h3 className="text-lg font-semibold mb-1">30 Mins</h3>
              <p className="text-xs text-white/50">30 situational questions.</p>
            </div>
          </motion.div>

          {/* Bento Box 3: Rule 2 */}
          <motion.div custom={4} variants={fadeUp} className="col-span-1 bg-[var(--sb-violet)]/10 border border-[var(--sb-violet)]/20 rounded-3xl p-6 backdrop-blur-md hover:bg-[var(--sb-violet)]/20 transition-colors flex flex-col justify-between aspect-square relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--sb-violet)]/30 rounded-full blur-2xl"></div>
            <Shield className="w-6 h-6 text-[var(--sb-violet-light)] relative z-10" />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold mb-1 text-[var(--sb-violet-light)]">Proctored</h3>
              <p className="text-xs text-white/60">Camera and tab tracking enabled.</p>
            </div>
          </motion.div>

          {/* Bento Box 4: Experience */}
          <motion.div custom={5} variants={fadeUp} className="col-span-2 bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-md hover:border-white/20 transition-colors flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold mb-1">Open for Freshers</h3>
              <p className="text-xs text-white/50 font-light">No prior experience required.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Zap className="w-4 h-4 text-white/70" />
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* Mobile-only subtle gradient bottom indicator */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--sb-violet)]/20 to-transparent pointer-events-none z-0"></div>
    </div>
  );
}
