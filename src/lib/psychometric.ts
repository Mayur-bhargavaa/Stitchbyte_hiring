export interface PsychometricQuestion {
    id: number;
    category?: string;
    difficulty?: "Easy" | "Medium" | "Hard";
    correctIndex: number;
}

export interface PsychometricInput {
    answers: Record<number, number>;
    questions: PsychometricQuestion[];
    examDuration?: number;
    tabViolations: number;
    cameraViolations: number;
}

export interface PsychometricProfile {
    communication: number;
    analytical: number;
    objectionHandling: number;
    learningAgility: number;
    stressDiscipline: number;
    overall: number;
}

function clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreByCategory(
    categoryName: string,
    answers: Record<number, number>,
    questions: PsychometricQuestion[]
): number {
    const subset = questions.filter((q) => (q.category || "").toLowerCase().includes(categoryName.toLowerCase()));
    if (subset.length === 0) return 50;

    const correct = subset.filter((q) => answers[q.id] === q.correctIndex).length;
    return clamp((correct / subset.length) * 100);
}

function scoreByDifficulty(
    level: "Easy" | "Medium" | "Hard",
    answers: Record<number, number>,
    questions: PsychometricQuestion[]
): number {
    const subset = questions.filter((q) => (q.difficulty || "Easy") === level);
    if (subset.length === 0) return 50;

    const correct = subset.filter((q) => answers[q.id] === q.correctIndex).length;
    return clamp((correct / subset.length) * 100);
}

export function analyzePsychometric(input: PsychometricInput): PsychometricProfile {
    const { answers, questions, examDuration, tabViolations, cameraViolations } = input;

    const communication = scoreByCategory("Cold Calling", answers, questions);
    const analytical = scoreByCategory("Lead Generation", answers, questions);
    const objectionHandling = scoreByCategory("Objection", answers, questions);

    const mediumScore = scoreByDifficulty("Medium", answers, questions);
    const hardScore = scoreByDifficulty("Hard", answers, questions);
    const learningAgility = clamp(mediumScore * 0.45 + hardScore * 0.55);

    const disciplinePenalty = Math.min(40, tabViolations * 6 + cameraViolations * 8);
    const timePenalty = examDuration && examDuration < 300 ? 10 : 0;
    const stressDiscipline = clamp(100 - disciplinePenalty - timePenalty);

    const overall = clamp(
        communication * 0.2 +
        analytical * 0.2 +
        objectionHandling * 0.2 +
        learningAgility * 0.25 +
        stressDiscipline * 0.15
    );

    return {
        communication,
        analytical,
        objectionHandling,
        learningAgility,
        stressDiscipline,
        overall,
    };
}
