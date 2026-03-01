import fs from "fs";
import path from "path";

export interface Candidate {
    candidateId: string;
    name: string;
    email: string;
    phone: string;
    salaryComfort: boolean;
    quizScore: number;
    quizTotal: number;
    tabViolations: number;
    qualificationStatus: "Invited" | "Applied" | "Qualified" | "Not Qualified";
    interviewStatus: "Pending" | "Booked" | "Completed" | "No Show";
    submissionDate: string;
    notes: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "candidates.json");

function ensureDataFile(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }
}

export function getCandidates(): Candidate[] {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Candidate[];
}

export function addCandidate(candidate: Candidate): Candidate {
    const candidates = getCandidates();
    const existing = candidates.findIndex(
        (c) => c.candidateId === candidate.candidateId || c.email === candidate.email
    );
    if (existing !== -1) {
        candidates[existing] = { ...candidates[existing], ...candidate };
    } else {
        candidates.push(candidate);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(candidates, null, 2));
    return candidate;
}

export function updateCandidate(
    candidateId: string,
    updates: Partial<Candidate>
): Candidate | null {
    const candidates = getCandidates();
    const idx = candidates.findIndex((c) => c.candidateId === candidateId);
    if (idx === -1) return null;
    candidates[idx] = { ...candidates[idx], ...updates };
    fs.writeFileSync(DATA_FILE, JSON.stringify(candidates, null, 2));
    return candidates[idx];
}

export function getStats() {
    const candidates = getCandidates();
    const total = candidates.length;
    const qualified = candidates.filter(
        (c) => c.qualificationStatus === "Qualified"
    ).length;
    const rejected = candidates.filter(
        (c) => c.qualificationStatus === "Not Qualified"
    ).length;
    const booked = candidates.filter(
        (c) => c.interviewStatus === "Booked" || c.interviewStatus === "Completed"
    ).length;
    const conversionRate =
        total > 0 ? ((qualified / total) * 100).toFixed(1) : "0";

    return { total, qualified, rejected, booked, conversionRate };
}

/**
 * Qualification Rule Engine (Updated)
 * - Salary comfort = YES
 * - Quiz score >= 60%
 * - Tab violations <= 3
 * - Freshers welcome (no experience requirement)
 */
export function qualifyCandidate(data: {
    salaryComfort: boolean;
    quizScore: number;
    quizTotal: number;
    tabViolations: number;
}): { qualified: boolean; scorePercent: number } {
    const scorePercent =
        data.quizTotal > 0
            ? Math.round((data.quizScore / data.quizTotal) * 100)
            : 0;

    const qualified =
        data.salaryComfort === true &&
        scorePercent >= 60 &&
        data.tabViolations <= 3;

    return { qualified, scorePercent };
}
