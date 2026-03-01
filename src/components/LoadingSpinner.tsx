"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function LoadingSpinner({ size = "md", text }: { size?: "sm" | "md" | "lg"; text?: string }) {
    const sizes = {
        sm: "w-4 h-4",
        md: "w-8 h-8",
        lg: "w-12 h-12",
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className={`${sizes[size]} animate-spin text-violet-400`} />
            {text && <p className="text-sm text-white/70">{text}</p>}
        </div>
    );
}

export function PageLoader() {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/60 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4"
            >
                <Loader2 className="w-12 h-12 animate-spin text-violet-400" />
                <p className="text-white/90 font-medium">Loading...</p>
            </motion.div>
        </div>
    );
}

export function FullPageLoader({ text = "Loading..." }: { text?: string }) {
    return (
        <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-violet-400" />
                <p className="text-white/70">{text}</p>
            </div>
        </div>
    );
}
