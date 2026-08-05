import { useEffect, useState } from "react";
import type { PersonalizedKit, QuizQuestion, SkinProfile } from "../types";
import { quizApi } from "../lib/api";
import TopBar from "../components/TopBar";

interface QuizPageProps {
  onBack: () => void;
  onComplete: (profile: SkinProfile, kit: PersonalizedKit) => void;
}

export default function QuizPage({ onBack, onComplete }: QuizPageProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    quizApi
      .questions()
      .then(({ questions }) => setQuestions(questions))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="screen">
        <TopBar title="Beauty Quiz" onBack={onBack} />
        <p className="loading-text">Memuat quiz…</p>
      </div>
    );
  }

  const question = questions[step];
  const selected = question ? (answers[question.id] ?? []) : [];
  const isLast = step === questions.length - 1;

  const toggleOption = (optionId: string) => {
    if (!question) return;
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.multiSelect) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: [optionId] };
    });
  };

  const handleNext = async () => {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { profile, kit } = await quizApi.submit(answers);
      onComplete(profile, kit);
    } catch {
      setError("Gagal memproses quiz. Coba lagi.");
      setSubmitting(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Beauty Quiz" onBack={onBack} />

      <div className="quiz-progress">
        {questions.map((q, i) => (
          <span key={q.id} className={`quiz-dot${i <= step ? " active" : ""}`} />
        ))}
      </div>

      {question && (
        <div className="quiz-body">
          <h2 className="quiz-question">{question.question}</h2>
          <div className="quiz-options">
            {question.options.map((opt) => (
              <button
                key={opt.id}
                className={`option-row${selected.includes(opt.id) ? " active" : ""}`}
                onClick={() => toggleOption(opt.id)}
              >
                <span className="option-row-title">{opt.label}</span>
                <span
                  className={`radio-dot${selected.includes(opt.id) ? " active" : ""}`}
                />
              </button>
            ))}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={selected.length === 0 || submitting}
          >
            {submitting ? "Menyusun trial kit…" : isLast ? "Lihat hasil" : "Lanjut"}
          </button>
        </div>
      )}
    </div>
  );
}
