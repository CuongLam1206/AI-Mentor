"use client";

/**
 * QuizModal – Adaptive Quiz
 * Supports: quiz by learning goal OR by enrolled course
 * Saves results to MongoDB on completion
 */

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-mentor-iwkf.onrender.com";

interface QuizQuestion {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
}

interface Goal {
    goal_id: string;
    title: string;
    current_level: string;
    target_score: string;
    deadline: string;
}

interface Props {
    goalTitle?: string;
    topic?: string;
    userId?: string;
    onClose: () => void;
}

type Step = "select" | "loading" | "quiz" | "result";

export default function QuizModal({ goalTitle, topic, userId = "default", onClose }: Props) {
    const hasTopic = !!(topic || goalTitle);
    const [step, setStep] = useState<Step>(hasTopic ? "loading" : "select");
    const [goals, setGoals] = useState<Goal[]>([]);
    const [customTopic, setCustomTopic] = useState("");
    const [loadingGoals, setLoadingGoals] = useState(!hasTopic);

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [score, setScore] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const cleanTopic = (topic || goalTitle || "").replace(/[#*`_]/g, "").trim();
    const [resolvedGoal, setResolvedGoal] = useState(cleanTopic);

    useEffect(() => {
        if (hasTopic) {
            startQuiz({ topic: cleanTopic });
        } else {
            fetch(`${API_URL}/api/user/goals?user_id=${userId}`)
                .then(r => r.json())
                .then(d => setGoals(d.goals || []))
                .catch(() => {})
                .finally(() => setLoadingGoals(false));
        }
    }, []);

    const startQuiz = async (params: { goal_id?: string; topic?: string }) => {
        setStep("loading");
        try {
            const body: Record<string, string> = { user_id: userId };
            if (params.goal_id) body.goal_id = params.goal_id;
            if (params.topic) body.topic = params.topic;
            const res = await fetch(`${API_URL}/api/quiz/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.goal_title) setResolvedGoal(data.goal_title);
            if (data.quiz && data.quiz.length > 0) {
                setQuestions(data.quiz);
                setAnswers(new Array(data.quiz.length).fill(null));
                setCurrentQ(0);
                setScore(0);
                setSelected(null);
                setRevealed(false);
                setStep("quiz");
            } else {
                setStep("select");
            }
        } catch {
            setStep("select");
        }
    };

    const handleSelect = (idx: number) => { if (!revealed) setSelected(idx); };

    const handleReveal = () => {
        if (selected === null) return;
        setRevealed(true);
        const newAnswers = [...answers];
        newAnswers[currentQ] = selected;
        setAnswers(newAnswers);
        if (selected === questions[currentQ].correct) setScore(s => s + 1);
    };

    const handleNext = () => {
        if (currentQ + 1 >= questions.length) {
            setStep("result");
            saveResult();
        } else {
            setCurrentQ(q => q + 1);
            setSelected(null);
            setRevealed(false);
        }
    };

    const saveResult = async () => {
        try {
            await fetch(`${API_URL}/api/quiz/result`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    goal_title: resolvedGoal,
                    topic: resolvedGoal,
                    score,
                    total: questions.length,
                }),
            });
        } catch { /* silent fail */ }
    };

    const q = questions[currentQ];

    return (
        <div className="quiz-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="quiz-modal">
                {/* Header */}
                <div className="quiz-modal__header">
                    <div className="quiz-modal__title">
                        <span className="quiz-modal__icon">🧠</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Kiểm tra kiến thức</div>
                            {resolvedGoal && step !== "select" && (
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                    {resolvedGoal}
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="quiz-modal__close" onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className="quiz-modal__body">
                    {/* ===== STEP: SELECT ===== */}
                    {step === "select" && (
                        <div className="quiz-select">
                            <div className="quiz-select__label">Chọn chủ đề kiểm tra</div>

                            {/* Custom topic input */}
                            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                <input
                                    className="form-input"
                                    style={{ flex: 1, fontSize: 13 }}
                                    placeholder="Nhập chủ đề bất kỳ... VD: IELTS Writing, Python OOP"
                                    value={customTopic}
                                    onChange={e => setCustomTopic(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && customTopic.trim() && startQuiz({ topic: customTopic.trim() })}
                                />
                                <button
                                    className="quiz-btn quiz-btn--primary"
                                    style={{ whiteSpace: "nowrap", padding: "8px 14px", fontSize: 13 }}
                                    disabled={!customTopic.trim()}
                                    onClick={() => startQuiz({ topic: customTopic.trim() })}
                                >
                                    🚀 Bắt đầu
                                </button>
                            </div>

                            {/* Goals */}
                            {loadingGoals ? (
                                <div className="quiz-loading"><div className="quiz-loading__spinner" /><span>Đang tải mục tiêu...</span></div>
                            ) : goals.length > 0 ? (
                                <>
                                    <div className="quiz-select__divider">— hoặc quiz theo mục tiêu —</div>
                                    {goals.map(g => (
                                        <button
                                            key={g.goal_id}
                                            className="quiz-select__option quiz-select__option--goal"
                                            onClick={() => startQuiz({ goal_id: g.goal_id })}
                                        >
                                            <span className="quiz-select__icon">🎯</span>
                                            <div>
                                                <div className="quiz-select__title">{g.title}</div>
                                                <div className="quiz-select__desc">
                                                    {g.current_level && `Hiện tại: ${g.current_level}`}{g.target_score ? ` → ${g.target_score}` : ""}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            ) : null}
                        </div>
                    )}

                    {/* ===== STEP: LOADING ===== */}
                    {step === "loading" && (
                        <div className="quiz-loading">
                            <div className="quiz-loading__spinner" />
                            <span>Đang tạo câu hỏi phù hợp với bạn...</span>
                        </div>
                    )}

                    {/* ===== STEP: QUIZ ===== */}
                    {step === "quiz" && q && (
                        <div className="quiz-question-area">
                            <div className="quiz-progress">
                                <div className="quiz-progress__bar">
                                    <div className="quiz-progress__fill" style={{ width: `${(currentQ / questions.length) * 100}%` }} />
                                </div>
                                <span className="quiz-progress__text">{currentQ + 1} / {questions.length}</span>
                            </div>
                            <div className="quiz-question">{q.question}</div>
                            <div className="quiz-options">
                                {q.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        className={`quiz-option ${selected === i ? "quiz-option--selected" : ""} ${
                                            revealed ? i === q.correct ? "quiz-option--correct" : selected === i ? "quiz-option--wrong" : "" : ""
                                        }`}
                                        onClick={() => handleSelect(i)}
                                        disabled={revealed}
                                    >
                                        <span className="quiz-option__letter">{["A","B","C","D"][i]}</span>
                                        <span className="quiz-option__text">{opt}</span>
                                        {revealed && i === q.correct && <span className="quiz-option__icon">✓</span>}
                                        {revealed && selected === i && i !== q.correct && <span className="quiz-option__icon quiz-option__icon--wrong">✗</span>}
                                    </button>
                                ))}
                            </div>
                            {revealed && (
                                <div className="quiz-explanation">
                                    <span className="quiz-explanation__icon">💡</span>
                                    <span>{q.explanation}</span>
                                </div>
                            )}
                            <div className="quiz-actions">
                                {!revealed ? (
                                    <button className="quiz-btn quiz-btn--primary" onClick={handleReveal} disabled={selected === null}>
                                        Kiểm tra đáp án
                                    </button>
                                ) : (
                                    <button className="quiz-btn quiz-btn--primary" onClick={handleNext}>
                                        {currentQ + 1 >= questions.length ? "Xem kết quả →" : "Câu tiếp theo →"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== STEP: RESULT ===== */}
                    {step === "result" && (
                        <div className="quiz-result">
                            <div className="quiz-result__emoji">
                                {score >= questions.length * 0.8 ? "🎉" : score >= questions.length * 0.5 ? "👍" : "📚"}
                            </div>
                            <div className="quiz-result__score">{score} / {questions.length}</div>
                            <div className="quiz-result__label">
                                {score >= questions.length * 0.8 ? "Xuất sắc! Bạn nắm vững kiến thức."
                                    : score >= questions.length * 0.5 ? "Khá tốt! Tiếp tục ôn luyện nhé."
                                    : "Hãy ôn lại phần này kỹ hơn nhé!"}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                                ✅ Kết quả đã được lưu lại
                            </div>
                            <div className="quiz-result__actions">
                                <button className="quiz-btn quiz-btn--primary" onClick={() => hasTopic ? startQuiz({ topic: cleanTopic }) : setStep("select")}>
                                    🔄 Làm lại
                                </button>
                                <button className="quiz-btn quiz-btn--secondary" onClick={onClose}>
                                    ✓ Xong
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
