"use client";

/**
 * GoalsScreen v2 – Multi-view goals management.
 * View "list"   → danh sách tất cả goals + nút thêm
 * View "detail" → chi tiết 1 goal + tabs: [🗺️ Sơ đồ | ✏️ Chỉnh sửa]
 */

import { useState, useEffect } from "react";
import RoadmapDiagram from "./RoadmapDiagram";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-mentor-iwkf.onrender.com";

// ===== Types =====

interface Milestone {
    milestone_id?: string;
    title: string;
    month: number;
    target: string;
    status: "pending" | "in_progress" | "completed";
    progress_pct: number;
    topics?: string[];
    activities?: string[];
    resources?: string[];
    courses?: { course_id: string; priority: number }[];  // backward compat
}

interface Plan {
    plan_id: string;
    goal_id: string;
    milestones: Milestone[];
}

interface Goal {
    goal_id: string;
    title: string;
    target_score?: number;
    current_level?: string;
    deadline?: string;
    daily_hours?: number;
    weekly_hours?: number;
    purpose?: string;
    weak_skills?: string[];
    strong_skills?: string[];
    status: string;
    created_at?: string;
}

interface Props {
    onBack: () => void;
    userId?: string;
}

// ===== Helper =====

function ProgressRing({ pct }: { pct: number }) {
    const color = pct >= 80 ? "#10b981" : pct >= 40 ? "#0ea5e9" : "#94a3b8";
    return (
        <svg viewBox="0 0 60 60" width="60" height="60">
            <circle cx="30" cy="30" r="25" fill="none" stroke="#e2e8f0" strokeWidth="5" />
            <circle cx="30" cy="30" r="25" fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${pct * 1.57} 157`} strokeLinecap="round"
                transform="rotate(-90 30 30)" />
            <text x="30" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">{pct}%</text>
        </svg>
    );
}

// ===== Phase 3: Progress Dashboard (7-day SVG bar chart) =====

const API_URL_GOALS = process.env.NEXT_PUBLIC_API_URL || "https://ai-mentor-iwkf.onrender.com";

function ProgressDashboard({ userId = "default" }: { userId?: string }) {
    const [streakData, setStreakData] = useState<{ streak: number; last_active: string | null; weekly_sessions: number[] } | null>(null);

    useEffect(() => {
        fetch(`${API_URL_GOALS}/api/streak?user_id=${userId}`)
            .then(r => r.json())
            .then(d => setStreakData(d))
            .catch(() => {});
    }, [userId]);

    // Build 7-day labels (Mon → Sun or today-6 → today)
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - 6 + i);
        return d.toLocaleDateString("vi-VN", { weekday: "short" });
    });

    // weekly_sessions is from backend (array of 0/1 for each of last 7 days),
    // or fall back to a simple bar based on streak
    const sessionData: number[] = streakData?.weekly_sessions
        ? streakData.weekly_sessions.slice(-7)
        : Array.from({ length: 7 }, (_, i) =>
            i >= 7 - Math.min((streakData?.streak ?? 0), 7) ? 1 : 0
        );

    const maxVal = Math.max(...sessionData, 1);
    const barW = 22;
    const barGap = 10;
    const chartW = 7 * barW + 6 * barGap; // = 214, bars fill exactly
    const chartH = 100;
    const svgH = chartH + 20; // room for day labels

    const activeDays = sessionData.filter(v => v > 0).length;
    const maxData = Math.max(...sessionData, 1);
    const BAR_AREA_H = 130;
    const SVG_W = 214;
    const SVG_H = BAR_AREA_H + 26;

    return (
        <div className="progress-dashboard">
            <div className="progress-dashboard__header">
                <span className="progress-dashboard__title">📈 Tiến độ 7 ngày gần đây</span>
                {streakData && streakData.streak > 0 && (
                    <span className="progress-dashboard__streak">🔥 {streakData.streak} ngày</span>
                )}
            </div>
            <div className="progress-dashboard__chart">
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="214" height={SVG_H} style={{ display: "block", margin: "0 auto" }}>
                    {/* Baseline */}
                    <line x1="0" y1={BAR_AREA_H} x2={SVG_W} y2={BAR_AREA_H} stroke="#e2e8f0" strokeWidth="1" />
                    {sessionData.map((val: number, i: number) => {
                        const barH = Math.max(6, (val / maxData) * BAR_AREA_H);
                        const x = i * (barW + barGap);
                        const y = BAR_AREA_H - barH;
                        const isToday = i === 6;
                        const active = val > 0;
                        return (
                            <g key={i}>
                                <rect x={x} y={y} width={barW} height={barH} rx={5}
                                    fill={active ? (isToday ? "#7c3aed" : "#a78bfa") : "#e2e8f0"}
                                    opacity={active ? 1 : 0.5}
                                />
                                <text x={x + barW / 2} y={BAR_AREA_H + 18} textAnchor="middle"
                                    fontSize="10" fill={isToday ? "#7c3aed" : "#64748b"}
                                    fontWeight={isToday ? "700" : "500"}>
                                    {days[i]}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="progress-dashboard__stats">
                <div className="progress-dashboard__stat">
                    <div className="progress-dashboard__stat-val">{activeDays}</div>
                    <div className="progress-dashboard__stat-label">Ngày học</div>
                </div>
                <div className="progress-dashboard__stat">
                    <div className="progress-dashboard__stat-val">{streakData?.streak ?? 0}</div>
                    <div className="progress-dashboard__stat-label">Streak 🔥</div>
                </div>
                <div className="progress-dashboard__stat">
                    <div className="progress-dashboard__stat-val">{7 - activeDays}</div>
                    <div className="progress-dashboard__stat-label">Ngày nghỉ</div>
                </div>
            </div>
        </div>
    );
}

// ===== Quiz Analytics Components =====

interface QuizHistoryData {
    daily: { date: string; avg_pct: number; count: number }[];
    recent: { goal_title: string; course_title: string; score: number; total: number; percentage: number; date: string }[];
    by_topic: { key: string; label: string; avg_pct: number; attempts: number }[];
}

function useQuizHistory(userId = "default") {
    const [data, setData] = useState<QuizHistoryData | null>(null);
    useEffect(() => {
        fetch(`${API_URL}/api/quiz/history?user_id=${userId}`)
            .then(r => r.json()).then(setData).catch(() => {});
    }, [userId]);
    return data;
}

// Feature 1: 7-day quiz score chart
function QuizScoreChart({ data }: { data: QuizHistoryData }) {
    const hasData = data.daily.some(d => d.count > 0);
    const W = 214, BAR_H = 100, LABEL_H = 18, H = BAR_H + LABEL_H;
    const barW = 22, barGap = 10;
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(today.getDate() - 6 + i);
        return d.toLocaleDateString("vi-VN", { weekday: "short" });
    });
    return (
        <div className="progress-dashboard" style={{ marginTop: 10 }}>
            <div className="progress-dashboard__header">
                <span className="progress-dashboard__title">🧠 Điểm Quiz 7 ngày</span>
                {!hasData && <span style={{ fontSize: 11, color: "#94a3b8" }}>Làm quiz để xem điểm</span>}
            </div>
            <div className="progress-dashboard__chart">
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
                    <line x1="0" y1={BAR_H} x2={W} y2={BAR_H} stroke="#e2e8f0" strokeWidth="1" />
                    {data.daily.map((d, i) => {
                        const pct = d.avg_pct;
                        const barH = d.count > 0 ? Math.max(6, (pct / 100) * BAR_H) : 0;
                        const x = i * (barW + barGap);
                        const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
                        return (
                            <g key={i}>
                                {d.count > 0 ? (
                                    <>
                                        <rect x={x} y={BAR_H - barH} width={barW} height={barH} rx={5} fill={color} />
                                        <text x={x + barW / 2} y={BAR_H - barH - 3} textAnchor="middle" fontSize="8" fill={color} fontWeight="700">{pct}%</text>
                                    </>
                                ) : (
                                    <rect x={x} y={BAR_H - 8} width={barW} height={8} rx={3} fill="#e2e8f0" opacity={0.6} />
                                )}
                                <text x={x + barW / 2} y={H - 2} textAnchor="middle" fontSize="10"
                                    fill={i === 6 ? "#7c3aed" : "#64748b"} fontWeight={i === 6 ? "700" : "500"}>
                                    {days[i]}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

// Collapsible wrapper for ProgressDashboard
function ProgressDashboardCollapsible({ userId = "default" }: { userId?: string }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 8 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "12px 16px", textAlign: "left" }}
            >
                <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>📈 Tiến độ 7 ngày gần đây</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && <ProgressDashboard userId={userId} />}
        </div>
    );
}

// Collapsible wrapper for QuizScoreChart
function QuizScoreChartCollapsible({ data }: { data: QuizHistoryData }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 8 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "12px 16px", textAlign: "left" }}
            >
                <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>🧠 Điểm Quiz 7 ngày</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && <QuizScoreChart data={data} />}
        </div>
    );
}

// Feature 4: Quiz history list — collapsible
function QuizHistory({ data, onQuizAgain }: { data: QuizHistoryData; onQuizAgain?: () => void }) {
    const [open, setOpen] = useState(false);
    if (data.recent.length === 0) return null;
    return (
        <div className="quiz-history">
            <button
                className="quiz-history__header"
                onClick={() => setOpen(o => !o)}
                style={{ width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0 }}
            >
                <span>📋 Lịch sử Quiz</span>
                {onQuizAgain && <button className="quiz-history__quiz-btn" onClick={e => { e.stopPropagation(); onQuizAgain(); }}>+ Làm quiz mới</button>}
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <div className="quiz-history__list">
                    {data.recent.slice(0, 5).map((r, i) => {
                        const pct = r.percentage ?? Math.round((r.score / r.total) * 100);
                        const dot = pct >= 80 ? "🟢" : pct >= 50 ? "🟡" : "🔴";
                        const label = r.course_title || r.goal_title || "Quiz";
                        const dateStr = r.date ? new Date(r.date).toLocaleDateString("vi-VN") : "";
                        return (
                            <div key={i} className="quiz-history__item">
                                <span className="quiz-history__dot">{dot}</span>
                                <span className="quiz-history__label">{label}</span>
                                <span className="quiz-history__score">{r.score}/{r.total} ({pct}%)</span>
                                <span className="quiz-history__date">{dateStr}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Feature 5: Weak topic smart reminder banner
function WeakTopicBanner({ data, onQuiz }: { data: QuizHistoryData; onQuiz?: (key: string) => void }) {
    const [dismissed, setDismissed] = useState(false);
    const weakTopic = data.by_topic.find(t => t.avg_pct < 60 && t.attempts >= 1);
    if (!weakTopic || dismissed) return null;
    return (
        <div className="weak-topic-banner">
            <span className="weak-topic-banner__icon">📚</span>
            <div className="weak-topic-banner__text">
                <strong>Cần ôn lại!</strong> Bạn đang đạt <strong>{weakTopic.avg_pct}%</strong> ở <em>{weakTopic.label}</em>.
            </div>
            <div className="weak-topic-banner__actions">
                {onQuiz && (
                    <button className="weak-topic-banner__btn" onClick={() => onQuiz(weakTopic.key)}>
                        🔄 Quiz lại
                    </button>
                )}
                <button className="weak-topic-banner__dismiss" onClick={() => setDismissed(true)}>✕</button>
            </div>
        </div>
    );
}

// ===== Feature A: Spaced Repetition Panel =====

interface SREntry { key: string; label: string; course_id: string; goal_title: string; avg_pct: number; last_quiz_date: string; days_until_review: number; overdue: boolean }

function SpacedRepetitionPanel({ userId = "default", onQuiz }: { userId?: string; onQuiz?: (courseId: string, goalTitle: string) => void }) {
    const [data, setData] = useState<{ due: SREntry[]; upcoming: SREntry[] } | null>(null);
    const [open, setOpen] = useState(true);
    useEffect(() => {
        fetch(`${API_URL}/api/spaced-repetition?user_id=${userId}`)
            .then(r => r.json()).then(setData).catch(() => {});
    }, [userId]);
    if (!data || (data.due.length === 0 && data.upcoming.length === 0)) return null;
    return (
        <div className="sr-panel">
            <button className="sr-panel__header" onClick={() => setOpen(o => !o)}>
                <span>🔁 Ôn tập thông minh</span>
                {data.due.length > 0 && <span className="sr-panel__badge">{data.due.length} cần ôn hôm nay</span>}
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <div className="sr-panel__body">
                    {data.due.length > 0 && (
                        <>
                            <div className="sr-panel__section-label">⚠️ Cần ôn hôm nay</div>
                            {data.due.map((e, i) => (
                                <div key={i} className="sr-card sr-card--due">
                                    <div className="sr-card__info">
                                        <span className="sr-card__label">{e.label}</span>
                                        <span className="sr-card__meta">Điểm: {e.avg_pct}% · Quiz cuối: {e.last_quiz_date || "Chưa có"}</span>
                                    </div>
                                    <button className="sr-card__btn" onClick={() => onQuiz?.(e.course_id, e.goal_title)}>Quiz ngay 🔄</button>
                                </div>
                            ))}
                        </>
                    )}
                    {data.upcoming.length > 0 && (
                        <>
                            <div className="sr-panel__section-label" style={{ marginTop: data.due.length > 0 ? 10 : 0 }}>📅 Sắp đến hạn</div>
                            {data.upcoming.map((e, i) => (
                                <div key={i} className="sr-card sr-card--upcoming">
                                    <div className="sr-card__info">
                                        <span className="sr-card__label">{e.label}</span>
                                        <span className="sr-card__meta">{e.days_until_review} ngày nữa · avg {e.avg_pct}%</span>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ===== Feature B: Weekly Report Card =====

interface WeeklyReportData { quiz_count: number; avg_quiz_pct: number; quiz_trend: number; active_days: number; msg_count: number; streak: number; milestone_progress: string; weakest_topic: { label: string; avg_pct: number } | null }

function WeeklyReport({ userId = "default" }: { userId?: string }) {
    const [report, setReport] = useState<WeeklyReportData | null>(null);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        fetch(`${API_URL}/api/weekly-report?user_id=${userId}`)
            .then(r => r.json()).then(d => setReport(d.report || null)).catch(() => {});
    }, [userId]);
    if (!report) return null;
    const trend = report.quiz_trend;
    const trendIcon = trend > 0 ? "📈" : trend < 0 ? "📉" : "➡️";
    const trendColor = trend > 0 ? "#10b981" : trend < 0 ? "#ef4444" : "#94a3b8";
    return (
        <div className="weekly-report">
            <button className="weekly-report__header" onClick={() => setOpen(o => !o)}>
                <span>📋 Báo cáo tuần</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>7 ngày gần đây</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <div className="weekly-report__body">
                    <div className="weekly-report__stats">
                        <div className="weekly-report__stat">
                            <div className="weekly-report__stat-val">{report.quiz_count}</div>
                            <div className="weekly-report__stat-label">Quiz đã làm</div>
                        </div>
                        <div className="weekly-report__stat">
                            <div className="weekly-report__stat-val" style={{ color: trendColor }}>{report.avg_quiz_pct}% {trendIcon}</div>
                            <div className="weekly-report__stat-label">Điểm TB</div>
                        </div>
                        <div className="weekly-report__stat">
                            <div className="weekly-report__stat-val">{report.active_days}</div>
                            <div className="weekly-report__stat-label">Ngày học</div>
                        </div>
                        <div className="weekly-report__stat">
                            <div className="weekly-report__stat-val">{report.msg_count}</div>
                            <div className="weekly-report__stat-label">Câu hỏi</div>
                        </div>
                    </div>
                    {report.milestone_progress !== "0/0" && (
                        <div className="weekly-report__milestone">🗺️ Tiến độ lộ trình: <strong>{report.milestone_progress}</strong> milestone hoàn thành</div>
                    )}
                    {report.weakest_topic && (
                        <div className="weekly-report__weak">⚠️ Điểm yếu: <strong>{report.weakest_topic.label}</strong> ({report.weakest_topic.avg_pct}%)</div>
                    )}
                    {trend !== 0 && (
                        <div className="weekly-report__trend" style={{ color: trendColor }}>
                            {trend > 0 ? `📈 Điểm quiz tăng ${trend}% so với tuần trước` : `📉 Điểm quiz giảm ${Math.abs(trend)}% so với tuần trước`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ===== Feature D: Study Schedule Card =====

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function StudyScheduleCard({ userId = "default" }: { userId?: string }) {
    const [open, setOpen] = useState(false);
    const [hour, setHour] = useState(20);
    const [minute, setMinute] = useState(0);
    const [days, setDays] = useState([1, 2, 3, 4, 5]);
    const [saved, setSaved] = useState(false);
    useEffect(() => {
        fetch(`${API_URL}/api/study-schedule?user_id=${userId}`)
            .then(r => r.json()).then(d => {
                if (d.schedule) {
                    setHour(d.schedule.hour ?? 20);
                    setMinute(d.schedule.minute ?? 0);
                    setDays(d.schedule.days ?? [1, 2, 3, 4, 5]);
                }
            }).catch(() => {});
    }, [userId]);
    const toggleDay = (d: number) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
    const saveSchedule = async () => {
        await fetch(`${API_URL}/api/study-schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, hour, minute, days }),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    return (
        <div className="schedule-card">
            <button className="schedule-card__header" onClick={() => setOpen(o => !o)}>
                <span>🗓️ Lịch học hàng ngày</span>
                <span className="schedule-card__time">{String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <div className="schedule-card__body">
                    <div className="schedule-card__label">Chọn ngày học</div>
                    <div className="schedule-card__days">
                        {DAY_LABELS.map((l, i) => (
                            <button key={i} className={`schedule-card__day ${days.includes(i) ? "schedule-card__day--on" : ""}`} onClick={() => toggleDay(i)}>{l}</button>
                        ))}
                    </div>
                    <div className="schedule-card__label" style={{ marginTop: 10 }}>Giờ học</div>
                    <div className="schedule-card__time-row">
                        <input type="number" className="schedule-card__input" min={0} max={23} value={hour} onChange={e => setHour(+e.target.value)} />
                        <span style={{ fontSize: 16, color: "#334155" }}>:</span>
                        <input type="number" className="schedule-card__input" min={0} max={59} step={5} value={minute} onChange={e => setMinute(+e.target.value)} />
                    </div>
                    <button className="schedule-card__save" onClick={saveSchedule}>
                        {saved ? "✅ Đã lưu!" : "💾 Lưu lịch học"}
                    </button>
                </div>
            )}
        </div>
    );
}

// ===== Goal List View =====

function GoalListView({ goals, plans, onSelectGoal, onCreateGoal, onBack, loading, onDeleteGoal, quizHistory, userId = "default" }: {
    goals: Goal[];
    plans: Record<string, Plan>;
    onSelectGoal: (g: Goal) => void;
    onCreateGoal: () => void;
    onBack: () => void;
    loading: boolean;
    onDeleteGoal: (id: string) => void;
    quizHistory?: QuizHistoryData | null;
    userId?: string;
}) {
    if (loading) return <div className="screen-container"><div className="screen-loading">Đang tải mục tiêu...</div></div>;

    const overallPct = (goal: Goal) => {
        const plan = plans[goal.goal_id];
        if (!plan?.milestones?.length) return 0;
        const done = plan.milestones.filter(m => m.status === "completed").length;
        return Math.round((done / plan.milestones.length) * 100);
    };

    return (
        <div className="screen-container">
            <div className="screen-header">
                <button className="screen-back" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="15 18 9 12 15 6" /></svg>
                    Quay lại
                </button>
                <h2 className="screen-title">🎯 Mục tiêu & Lộ trình</h2>
                    <button className="screen-save" onClick={onCreateGoal}>+ Thêm</button>
            </div>

            <div className="screen-body">
                {/* ===== Charts + Analytics — each individually collapsible ===== */}
                <ProgressDashboardCollapsible userId={userId} />
                {quizHistory && <WeakTopicBanner data={quizHistory} />}
                {quizHistory && <QuizScoreChartCollapsible data={quizHistory} />}
                {quizHistory && <QuizHistory data={quizHistory} />}
                <WeeklyReport userId={userId} />
                <StudyScheduleCard userId={userId} />

                {goals.length === 0 ? (
                    <div className="goals-empty">
                        <div className="goals-empty__icon">🎯</div>
                        <h3 className="goals-empty__title">Chưa có mục tiêu nào</h3>
                        <p className="goals-empty__desc">Chat với AI Tutor để lập lộ trình, hoặc tự tạo mục tiêu.</p>
                        <button className="goals-empty__btn" onClick={onCreateGoal}>+ Tạo mục tiêu mới</button>
                        <button className="goals-empty__btn" style={{ background: "#f1f5f9", color: "#0ea5e9", marginTop: 8 }} onClick={onBack}>💬 Chat với AI Tutor</button>
                    </div>
                ) : (
                    <div className="goals-list">
                        {goals.map(goal => (
                            <div
                                key={goal.goal_id}
                                className="goal-card goal-card--clickable"
                                onClick={() => onSelectGoal(goal)}
                                style={{ position: "relative" }}
                            >
                                {/* Quick delete button */}
                                <button
                                    className="goal-card__delete-btn"
                                    title="Xóa roadmap này"
                                    onClick={e => {
                                        e.stopPropagation();
                                        if (window.confirm(`Xóa mục tiêu "${goal.title}"?`)) {
                                            onDeleteGoal(goal.goal_id);
                                        }
                                    }}
                                >
                                    🗑
                                </button>

                                <div className="goal-card__header">
                                    <div className="goal-card__info">
                                        <h3 className="goal-card__title">{goal.title}</h3>
                                        <div className="goal-card__meta">
                                            {goal.target_score && <span>🎯 Target: {goal.target_score}</span>}
                                            {goal.current_level && <span>📊 Hiện tại: {goal.current_level}</span>}
                                            {goal.deadline && <span>⏰ {goal.deadline}</span>}
                                            {goal.weekly_hours && <span>⏱ {goal.weekly_hours}h/tuần</span>}
                                            {(goal as Goal & { purpose?: string }).purpose && (
                                                <span>
                                                    {goal.purpose === "exam" && "🎓 Thi / Chứng chỉ"}
                                                    {goal.purpose === "job" && "💼 Xin việc"}
                                                    {goal.purpose === "study_abroad" && "✈️ Du học"}
                                                    {goal.purpose === "personal" && "🌱 Sở thích"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="goal-card__milestones-count">
                                            {plans[goal.goal_id]?.milestones?.length || 0} milestones · Nhấn để xem & sửa →
                                        </div>
                                        {goal.created_at && (
                                            <div className="goal-card__created">
                                                📅 Tạo ngày {new Date(goal.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                            </div>
                                        )}
                                    </div>
                                    <ProgressRing pct={overallPct(goal)} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ===== Shared skill tag helper =====
function SkillTagInput({ label, tags, setTags, colorClass, placeholder }: {
    label: string; tags: string[]; setTags: (t: string[]) => void; colorClass: string; placeholder: string;
}) {
    const [input, setInput] = useState("");
    const add = (val: string) => {
        const t = val.trim();
        if (t && !tags.includes(t)) setTags([...tags, t]);
    };
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div className="form-tags">
                {tags.map(sk => (
                    <span key={sk} className={`form-tag ${colorClass}`}>
                        {sk}
                        <button className="form-tag__remove" onClick={() => setTags(tags.filter(s => s !== sk))}>✕</button>
                    </span>
                ))}
                <input className="form-tag-input" type="text" placeholder={placeholder}
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); setInput(""); } }}
                />
            </div>
        </div>
    );
}

// ===== Create Goal Modal =====

interface ProfileDefaults {
    level?: string;
    daily_hours?: number;
    weak_skills?: string[];
    strong_skills?: string[];
}

function CreateGoalModal({ onSave, onClose, defaultProfile }: {
    onSave: (data: Partial<Goal>) => void;
    onClose: () => void;
    defaultProfile?: ProfileDefaults;
}) {
    const [title, setTitle] = useState("");
    const [targetScore, setTargetScore] = useState("");
    const [currentLevel, setCurrentLevel] = useState(defaultProfile?.level || "");
    const [deadline, setDeadline] = useState("");
    const [purpose, setPurpose] = useState("");
    const [customPurpose, setCustomPurpose] = useState("");
    const defaultWeekly = defaultProfile?.daily_hours
        ? String(Math.round(defaultProfile.daily_hours * 5))
        : "8";
    const [weeklyHours, setWeeklyHours] = useState(defaultWeekly);
    const [weakSkillsInput, setWeakSkillsInput] = useState<string[]>(defaultProfile?.weak_skills || []);
    const [strongSkillsInput, setStrongSkillsInput] = useState<string[]>(defaultProfile?.strong_skills || []);

    const PURPOSE_OPTIONS = [
        { value: "exam",     label: "🎓 Thi đại học / Thi chứng chỉ" },
        { value: "job",      label: "💼 Xin việc / Thăng tiến" },
        { value: "study_abroad", label: "✈️ Du học / Định cư" },
        { value: "personal", label: "🌱 Phát triển cá nhân / Sở thích" },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">➕ Tạo mục tiêu mới</h3>

                {/* Tên */}
                <div className="form-group">
                    <label className="form-label">Tên mục tiêu *</label>
                    <input className="form-input" placeholder="VD: Đạt IELTS 6.5" value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                {/* Mục đích */}
                <div className="form-group">
                    <label className="form-label">Mục đích học</label>
                    <div className="form-chips" style={{ gap: 6 }}>
                        {PURPOSE_OPTIONS.map(p => (
                            <button
                                key={p.value}
                                className={`form-chip ${purpose === p.value ? "form-chip--active" : ""}`}
                                style={{ fontSize: 12, padding: "5px 10px" }}
                                onClick={() => { setPurpose(p.value); setCustomPurpose(""); }}
                            >
                                {p.label}
                            </button>
                        ))}
                        {/* Tab khác */}
                        <button
                            className={`form-chip ${purpose === "other" ? "form-chip--active" : ""}`}
                            style={{ fontSize: 12, padding: "5px 10px" }}
                            onClick={() => setPurpose("other")}
                        >
                            ✏️ Khác
                        </button>
                    </div>
                    {/* Custom purpose input - hiện khi chọn Khác */}
                    {purpose === "other" && (
                        <input
                            className="form-input"
                            style={{ marginTop: 8 }}
                            placeholder="Nhập mục đích của bạn..."
                            value={customPurpose}
                            onChange={e => setCustomPurpose(e.target.value)}
                            autoFocus
                        />
                    )}
                </div>

                {/* Trình độ & Điểm */}
                <div className="form-row">
                    <div className="form-group form-group--half">
                        <label className="form-label">Trình độ hiện tại</label>
                        <input className="form-input" placeholder="VD: 5.0 hoặc Beginner" value={currentLevel} onChange={e => setCurrentLevel(e.target.value)} />
                    </div>
                    <div className="form-group form-group--half">
                        <label className="form-label">Điểm / mức mục tiêu</label>
                        <input className="form-input" type="text" placeholder="VD: 6.5 hoặc 8/10" value={targetScore} onChange={e => setTargetScore(e.target.value)} />
                    </div>
                </div>

                {/* Deadline & giờ/tuần */}
                <div className="form-row">
                    <div className="form-group form-group--half">
                        <label className="form-label">Deadline</label>
                        <input className="form-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                    </div>
                    <div className="form-group form-group--half">
                        <label className="form-label">Giờ học/tuần dành cho goal này</label>
                        <input className="form-input" type="number" min={1} max={60} placeholder="VD: 8"
                            value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)} />
                    </div>
                </div>

                {/* Pre-fill notice */}
                {defaultProfile?.level && (
                    <div style={{ background: "#EEF0FF", border: "1px solid #C4B5FD", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#4F46E5", marginBottom: 8 }}>
                        ✨ <strong>Đã điền sẵn từ Hồ sơ của bạn</strong> — bạn có thể điều chỉnh theo từng lĩnh vực cụ thể
                    </div>
                )}

                {/* Skills dành riêng cho goal này */}
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e", marginBottom: 8 }}>
                    💡 Điền kỹ năng <strong>theo lĩnh vực của goal này</strong> (VD: IELTS → Writing, Listening / Python → OOP, Algorithms)
                </div>
                <SkillTagInput label="⚠️ Kỹ năng cần cải thiện (trong lĩnh vực này)"
                    tags={weakSkillsInput} setTags={setWeakSkillsInput}
                    colorClass="form-tag--weak" placeholder="Nhập rồi Enter... VD: Writing, Speaking" />
                <SkillTagInput label="✅ Kỹ năng đã có (trong lĩnh vực này)"
                    tags={strongSkillsInput} setTags={setStrongSkillsInput}
                    colorClass="form-tag--strong" placeholder="Nhập rồi Enter... VD: Reading, Grammar" />

                <div className="modal-actions">
                    <button className="modal-btn modal-btn--cancel" onClick={onClose}>Hủy</button>
                    <button
                        className="modal-btn modal-btn--save"
                        disabled={!title.trim()}
                        onClick={() => onSave({
                            title,
                            target_score: targetScore ? parseFloat(targetScore) : undefined,
                            current_level: currentLevel,
                            deadline,
                            purpose: purpose === "other" ? (customPurpose.trim() || "other") : purpose,
                            weekly_hours: weeklyHours ? parseInt(weeklyHours) : 8,
                            daily_hours: weeklyHours ? Math.round(parseInt(weeklyHours) / 5 * 10) / 10 : 1.5,
                            weak_skills: weakSkillsInput,
                            strong_skills: strongSkillsInput,
                        } as Partial<Goal>)}
                    >
                        Tạo mục tiêu
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== Goal Detail View =====

function GoalDetailView({ goal, plan, onBack, onSaved, onDelete, generatingRoadmap, userId = "guest" }: {
    goal: Goal;
    plan: Plan | null;
    onBack: () => void;
    onSaved: () => void;
    onDelete: () => void;
    generatingRoadmap?: boolean;
    userId?: string;
}) {
    const [milestones, setMilestones] = useState<Milestone[]>(plan?.milestones || []);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<"diagram" | "edit">("diagram");
    const [goalTitle, setGoalTitle] = useState(goal.title);
    const [goalTarget, setGoalTarget] = useState(goal.target_score?.toString() || "");
    const [goalLevel, setGoalLevel] = useState(goal.current_level || "");
    const [goalDeadline, setGoalDeadline] = useState(goal.deadline || "");
    const [goalWeakSkills, setGoalWeakSkills] = useState<string[]>(goal.weak_skills || []);
    const [goalStrongSkills, setGoalStrongSkills] = useState<string[]>(goal.strong_skills || []);

    // Sync milestones when plan prop changes (e.g., after async AI generation)
    useEffect(() => {
        if (plan?.milestones) setMilestones(plan.milestones);
    }, [plan]);

    const overallPct = milestones.length > 0
        ? Math.round(milestones.filter(m => m.status === "completed").length / milestones.length * 100)
        : 0;

    const addMilestone = () => {
        setMilestones([...milestones, {
            milestone_id: `ms_new_${Date.now()}`,
            title: "",
            month: (milestones[milestones.length - 1]?.month || 0) + 1,
            target: "",
            status: "pending",
            progress_pct: 0,
            topics: [],
            activities: [],
            resources: [],
            courses: [],
        }]);
    };

    const updateMilestone = (idx: number, field: string, value: string | number) => {
        const updated = [...milestones];
        (updated[idx] as unknown as Record<string, unknown>)[field] = value;
        setMilestones(updated);
    };

    const removeMilestone = (idx: number) => setMilestones(milestones.filter((_, i) => i !== idx));

    const cycleStatus = (idx: number) => {
        const order: Milestone["status"][] = ["pending", "in_progress", "completed"];
        const current = milestones[idx].status as Milestone["status"];
        const next = order[(order.indexOf(current) + 1) % order.length];
        const updated = [...milestones];
        updated[idx] = { ...updated[idx], status: next, progress_pct: next === "completed" ? 100 : next === "pending" ? 0 : updated[idx].progress_pct };
        setMilestones(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await fetch(`${API_URL}/api/goals/${goal.goal_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: goalTitle, target_score: goalTarget ? parseFloat(goalTarget) : null, current_level: goalLevel, deadline: goalDeadline, weak_skills: goalWeakSkills, strong_skills: goalStrongSkills }),
            });
            await fetch(`${API_URL}/api/goals/${goal.goal_id}/milestones`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ milestones }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Xóa mục tiêu "${goalTitle}"?`)) return;
        await fetch(`${API_URL}/api/goals/${goal.goal_id}`, { method: "DELETE" });
        onDelete();
    };

    const STATUS_LABEL: Record<string, string> = { pending: "⚪ Chưa bắt đầu", in_progress: "🔵 Đang học", completed: "✅ Hoàn thành" };
    const getProgressColor = (pct: number) => pct >= 80 ? "#10b981" : pct >= 40 ? "#0ea5e9" : "#94a3b8";

    return (
        <div className="screen-container">
            {/* Header */}
            <div className="screen-header">
                <button className="screen-back" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="15 18 9 12 15 6" /></svg>
                    Quay lại
                </button>
                <h2 className="screen-title" style={{ fontSize: 15, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🎯 {goalTitle || "Mục tiêu"}
                </h2>
                <button
                    className={`screen-save ${saving ? "screen-save--saving" : ""} ${saved ? "screen-save--saved" : ""}`}
                    onClick={handleSave} disabled={saving}
                >
                    {saving ? "Đang lưu..." : saved ? "✓ Đã lưu" : "Lưu"}
                </button>
            </div>

            <div className="screen-body">
                {/* Goal Info Block */}
                <div className="goal-detail-info">
                    <div className="goal-detail-info__left">
                        <div className="form-group" style={{ marginBottom: 10 }}>
                            <label className="form-label">Tên mục tiêu</label>
                            <input className="form-input" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} />
                        </div>
                        <div className="form-row" style={{ gap: 8 }}>
                            <div className="form-group form-group--half">
                                <label className="form-label">Hiện tại</label>
                                <input className="form-input" placeholder="VD: 5.0" value={goalLevel} onChange={e => setGoalLevel(e.target.value)} />
                            </div>
                            <div className="form-group form-group--half">
                                <label className="form-label">Mục tiêu</label>
                                <input className="form-input" type="number" placeholder="VD: 6.5" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Deadline</label>
                            <input className="form-input" type="date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <ProgressRing pct={overallPct} />
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                            {milestones.filter(m => m.status === "completed").length}/{milestones.length} milestones
                        </div>
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="rdm-tabs">
                    <button
                        className={`rdm-tab ${activeTab === "diagram" ? "rdm-tab--active" : ""}`}
                        onClick={() => setActiveTab("diagram")}
                    >
                        🗺️ Sơ đồ lộ trình
                    </button>
                    <button
                        className={`rdm-tab ${activeTab === "edit" ? "rdm-tab--active" : ""}`}
                        onClick={() => setActiveTab("edit")}
                    >
                        ✏️ Chỉnh sửa
                    </button>
                </div>

                {/* Diagram tab */}
                {activeTab === "diagram" && (
                    generatingRoadmap ? (
                        <div className="rdm-generating-banner">
                            <div className="rdm-generating-banner__spinner">✨</div>
                            <div>
                                <div className="rdm-generating-banner__title">AI đang tạo lộ trình thông minh...</div>
                                <div className="rdm-generating-banner__sub">Gemini đang phân tích mục tiêu và gợi ý lộ trình cá nhân hóa. Vài giây thôi!</div>
                            </div>
                        </div>
                    ) : (
                        <RoadmapDiagram
                            milestones={milestones}
                            goalTitle={goalTitle}
                            goalId={goal.goal_id}
                            userId={userId}
                            onMilestonesUpdate={(updated) => setMilestones(updated as Milestone[])}
                        />
                    )
                )}

                {/* Edit tab */}
                {activeTab === "edit" && (
                    <div className="milestones-editor">
                        <div className="milestones-editor__header">
                            <span className="milestones-editor__label">📋 Lộ trình ({milestones.length} bước)</span>
                            <button className="milestones-editor__add" onClick={addMilestone}>+ Thêm bước</button>
                        </div>

                        {milestones.length === 0 && (
                            <div className="milestones-empty">
                                Chưa có bước nào. Nhấn <strong>+ Thêm bước</strong> hoặc chat với AI để tạo lộ trình.
                            </div>
                        )}

                        {milestones.map((ms, idx) => (
                            <div key={ms.milestone_id || idx} className="milestone-editor-card">
                                <div className="milestone-editor-card__top">
                                    <span className="milestone-editor-card__num">#{idx + 1}</span>
                                    <input
                                        className="milestone-editor-card__title"
                                        placeholder="Tên bước (VD: Nền tảng Listening)"
                                        value={ms.title}
                                        onChange={e => updateMilestone(idx, "title", e.target.value)}
                                    />
                                    <button className="milestone-editor-card__delete" onClick={() => removeMilestone(idx)} title="Xóa bước này">✕</button>
                                </div>
                                <div className="milestone-editor-card__row">
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11 }}>Mục tiêu bước này</label>
                                        <input className="form-input" style={{ fontSize: 13 }}
                                            placeholder="VD: Nắm vững từ vựng 3000 từ"
                                            value={ms.target}
                                            onChange={e => updateMilestone(idx, "target", e.target.value)}
                                        />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", minWidth: 70 }}>
                                        <label className="form-label" style={{ fontSize: 11 }}>Tháng</label>
                                        <input className="form-input" style={{ fontSize: 13, textAlign: "center", width: 60 }}
                                            type="number" min={1} value={ms.month}
                                            onChange={e => updateMilestone(idx, "month", parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                </div>
                                <div className="milestone-editor-card__footer">
                                    <button
                                        className={`milestone-status-btn milestone-status-btn--${ms.status}`}
                                        onClick={() => cycleStatus(idx)}
                                        title="Bấm để chuyển trạng thái"
                                    >
                                        {STATUS_LABEL[ms.status] || "⚪ Chưa bắt đầu"}
                                    </button>
                                    <div className="milestone-pct-input">
                                        <input type="range" min={0} max={100} value={ms.progress_pct || 0}
                                            onChange={e => updateMilestone(idx, "progress_pct", parseInt(e.target.value))}
                                            className="form-slider"
                                            style={{ width: 100 }}
                                        />
                                        <span style={{ fontSize: 12, color: getProgressColor(ms.progress_pct || 0), fontWeight: 600, minWidth: 34 }}>
                                            {ms.progress_pct || 0}%
                                        </span>
                                    </div>
                                </div>
                                {/* Topics / Activities / Resources */}
                                <div style={{ padding: "6px 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ fontSize: 11, color: "#64748b" }}>
                                        <span style={{ fontWeight: 600 }}>📚 Topics:</span>{" "}
                                        <input
                                            style={{ border: "none", outline: "none", fontSize: 11, color: "#334155", width: "calc(100% - 60px)", background: "transparent" }}
                                            placeholder="VD: Present Perfect, Passive Voice"
                                            value={(ms.topics || []).join(", ")}
                                            onChange={e => { const updated = [...milestones]; updated[idx] = { ...updated[idx], topics: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }; setMilestones(updated); }}
                                        />
                                    </div>
                                    <div style={{ fontSize: 11, color: "#64748b" }}>
                                        <span style={{ fontWeight: 600 }}>🎯 Hoạt động:</span>{" "}
                                        <input
                                            style={{ border: "none", outline: "none", fontSize: 11, color: "#334155", width: "calc(100% - 80px)", background: "transparent" }}
                                            placeholder="VD: Làm bài tập, Nghe podcast"
                                            value={(ms.activities || []).join(", ")}
                                            onChange={e => { const updated = [...milestones]; updated[idx] = { ...updated[idx], activities: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }; setMilestones(updated); }}
                                        />
                                    </div>
                                    <div style={{ fontSize: 11, color: "#64748b" }}>
                                        <span style={{ fontWeight: 600 }}>🔗 Tài nguyên:</span>{" "}
                                        <input
                                            style={{ border: "none", outline: "none", fontSize: 11, color: "#334155", width: "calc(100% - 80px)", background: "transparent" }}
                                            placeholder="VD: Cambridge Grammar, Grammarly Blog"
                                            value={(ms.resources || []).join(", ")}
                                            onChange={e => { const updated = [...milestones]; updated[idx] = { ...updated[idx], resources: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }; setMilestones(updated); }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Skills c\u1ee7a goal n\u00e0y - ch\u1ec9 hi\u1ec7n \u1edf tab edit */}
                {activeTab === "edit" && (
                    <div className="milestones-editor" style={{ marginTop: 20 }}>
                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e", marginBottom: 12 }}>
                            💡 <strong>Kỹ năng trong lĩnh vực này</strong> — AI dùng để ưu tiên gợi ý phương pháp học phù hợp
                        </div>
                        <SkillTagInput
                            label="⚠️ Kỹ năng cần cải thiện (goal này)"
                            tags={goalWeakSkills} setTags={setGoalWeakSkills}
                            colorClass="form-tag--weak"
                            placeholder="VD: Writing, Speaking, OOP..."
                        />
                        <SkillTagInput
                            label="✅ Kỹ năng đã có (goal này)"
                            tags={goalStrongSkills} setTags={setGoalStrongSkills}
                            colorClass="form-tag--strong"
                            placeholder="VD: Reading, Listening, Python cơ bản..."
                        />
                    </div>
                )}

                {/* Danger zone */}
                <div style={{ textAlign: "center", marginTop: 32, paddingBottom: 24 }}>
                    <button onClick={handleDelete} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
                        🗑 Xóa mục tiêu này
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== Main Component =====

export default function GoalsScreen({ onBack, userId = "default" }: Props) {
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [plans, setPlans] = useState<Record<string, Plan>>({});
    const [view, setView] = useState<"list" | "detail">("list");
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [profile, setProfile] = useState<ProfileDefaults | undefined>(undefined);
    const quizHistory = useQuizHistory(userId);

    useEffect(() => { loadGoals(); loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/profile`);
            if (res.ok) {
                const data = await res.json();
                const p = data.profile || data;
                setProfile({
                    level: p.level || "",
                    daily_hours: p.daily_hours,
                    weak_skills: p.weak_skills || [],
                    strong_skills: p.strong_skills || [],
                });
            }
        } catch { /* profile not found is fine */ }
    };

    const loadGoals = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/goals`);
            const data = await res.json();
            const goalList: Goal[] = data.goals || [];
            setGoals(goalList);

            const planMap: Record<string, Plan> = {};
            await Promise.all(goalList.map(async (g) => {
                try {
                    const r = await fetch(`${API_URL}/api/goals/${g.goal_id}`);
                    const d = await r.json();
                    if (d.plan) planMap[g.goal_id] = d.plan;
                } catch { /* skip */ }
            }));
            setPlans(planMap);
        } finally {
            setLoading(false);
        }
    };

    const openGoal = (g: Goal) => {
        setSelectedGoal(g);
        setSelectedPlan(plans[g.goal_id] || null);
        setView("detail");
    };

    const [generatingRoadmap, setGeneratingRoadmap] = useState<string | null>(null); // goal_id being generated

    const handleCreateGoal = async (data: Partial<Goal>) => {
        try {
            const res = await fetch(`${API_URL}/api/goals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, user_id: userId }),
            });
            const d = await res.json();
            setShowCreate(false);

            if (d.goal) {
                const goalId = d.goal.goal_id;
                // Navigate to detail immediately
                setSelectedGoal(d.goal);
                setSelectedPlan(null);
                setView("detail");

                // Auto-generate roadmap in background
                setGeneratingRoadmap(goalId);
                try {
                    const rdmRes = await fetch(`${API_URL}/api/goals/${goalId}/generate-roadmap`, { method: "POST" });
                    const rdmData = await rdmRes.json();
                    if (rdmData.plan) {
                        setSelectedPlan(rdmData.plan);
                        setPlans(prev => ({ ...prev, [goalId]: rdmData.plan }));
                    }
                } catch (e) {
                    console.error("Lỗi generate roadmap:", e);
                } finally {
                    setGeneratingRoadmap(null);
                }

                await loadGoals();
            }
        } catch (err) {
            console.error("Lỗi tạo goal:", err);
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        try {
            await fetch(`${API_URL}/api/goals/${goalId}`, { method: "DELETE" });
            await loadGoals();
        } catch (err) {
            console.error("Lỗi xóa goal:", err);
        }
    };

    if (view === "detail" && selectedGoal) {
        return (
            <GoalDetailView
                goal={selectedGoal}
                plan={selectedPlan}
                onBack={() => { setView("list"); loadGoals(); }}
                onSaved={loadGoals}
                onDelete={() => { setView("list"); loadGoals(); }}
                generatingRoadmap={generatingRoadmap === selectedGoal.goal_id}
                userId={userId}
            />
        );
    }

    return (
        <>
            <GoalListView
                goals={goals}
                plans={plans}
                onSelectGoal={openGoal}
                onCreateGoal={() => setShowCreate(true)}
                onBack={onBack}
                loading={loading}
                onDeleteGoal={handleDeleteGoal}
                quizHistory={quizHistory}
                userId={userId}
            />
            {showCreate && (
                <CreateGoalModal
                    onSave={handleCreateGoal}
                    onClose={() => setShowCreate(false)}
                    defaultProfile={profile}
                />
            )}
        </>
    );
}
