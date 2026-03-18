"use client";

/**
 * Learnify – Roadmap Page
 * Visual timeline hiển thị lộ trình học theo từng mục tiêu
 * Dark mode, premium design, animated nodes
 */

import { useEffect, useState } from "react";
import "./roadmap.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-mentor-iwkf.onrender.com";

interface CourseInMilestone {
    course_id: string;
    priority: number;
}

interface Milestone {
    milestone_id: string;
    title: string;
    month: number;
    courses: CourseInMilestone[];
    target: string;
    status: string;
    progress_pct: number;
}

interface Goal {
    goal_id: string;
    title: string;
    target_score?: number;
    current_level?: string;
    deadline?: string;
    weekly_hours?: number;
    status: string;
}

interface Plan {
    plan_id: string;
    milestones: Milestone[];
}

interface GoalWithPlan {
    goal: Goal;
    plan: Plan | null;
}

interface CourseInfo {
    course_id: string;
    title: string;
    category: string;
    level: string;
    duration_hours: number;
}

const GOAL_EMOJIS: Record<string, string> = { "Toán": "📐", "IELTS": "🌍", "Python": "🐍" };

function getGoalEmoji(title: string): string {
    for (const [key, emoji] of Object.entries(GOAL_EMOJIS)) {
        if (title.toLowerCase().includes(key.toLowerCase())) return emoji;
    }
    return "🎯";
}

export default function RoadmapPage() {
    const [goalsWithPlans, setGoalsWithPlans] = useState<GoalWithPlan[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});
    const [courses, setCourses] = useState<CourseInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [courseRes, goalRes, progressRes] = await Promise.all([
                fetch(`${API_URL}/api/courses`),
                fetch(`${API_URL}/api/goals`),
                fetch(`${API_URL}/api/progress/default`).catch(() => null),
            ]);

            if (courseRes.ok) {
                const d = await courseRes.json();
                setCourses(d.courses || []);
            }

            if (progressRes?.ok) {
                const d = await progressRes.json();
                // Chuyển list sang dict
                const pMap: Record<string, number> = {};
                (d.progress || []).forEach((p: any) => { pMap[p.course_id] = p.percent_complete; });
                setCourseProgress(pMap);
            }

            if (goalRes.ok) {
                const d = await goalRes.json();
                const gs: Goal[] = d.goals || [];

                const gwps: GoalWithPlan[] = await Promise.all(
                    gs.map(async (g) => {
                        try {
                            const planRes = await fetch(`${API_URL}/api/goals/${g.goal_id}`);
                            if (planRes.ok) {
                                const pd = await planRes.json();
                                return { goal: g, plan: pd.plan || null };
                            }
                        } catch { }
                        return { goal: g, plan: null };
                    })
                );
                setGoalsWithPlans(gwps);
            }
        } catch (e) {
            console.error("Lỗi tải dữ liệu:", e);
        } finally {
            setLoading(false);
        }
    };

    const getCourseName = (courseId: string) => courses.find(c => c.course_id === courseId)?.title || courseId;
    const getCourseProgress = (courseId: string) => courseProgress[courseId] || 0;

    const getOverallProgress = (plan: Plan | null) => {
        if (!plan?.milestones?.length) return 0;
        return Math.round(plan.milestones.reduce((a, ms) => a + (ms.progress_pct || 0), 0) / plan.milestones.length);
    };

    const getCompletedCount = (plan: Plan | null) =>
        plan?.milestones?.filter(ms => ms.status === "completed").length || 0;

    const getInProgressCount = (plan: Plan | null) =>
        plan?.milestones?.filter(ms => ms.status === "in_progress").length || 0;

    const getTotalCourses = (plan: Plan | null) =>
        plan?.milestones?.reduce((a, ms) => a + ms.courses.length, 0) || 0;

    const getDeadlineCountdown = (deadline?: string) => {
        if (!deadline) return "Chưa đặt";
        const d = new Date(deadline);
        const now = new Date();
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return "Đã quá hạn";
        const months = Math.floor(diffDays / 30);
        const days = diffDays % 30;
        return months > 0 ? `${months} tháng ${days} ngày` : `${days} ngày`;
    };

    const getDotIcon = (status: string) => {
        switch (status) {
            case "completed": return "✓";
            case "in_progress": return "▶";
            default: return "";
        }
    };

    const activeGwp = goalsWithPlans[activeIdx] || null;
    const activeGoal = activeGwp?.goal || null;
    const activePlan = activeGwp?.plan || null;

    if (loading) {
        return (
            <main className="roadmap-page">
                <div className="roadmap-loading">
                    <div className="roadmap-loading__spinner" />
                    <p>Đang tải lộ trình...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="roadmap-page">
            {/* Header */}
            <header className="roadmap-header">
                <div className="roadmap-header__content">
                    <div className="roadmap-header__logo">
                        <span style={{ fontSize: 24 }}>🎓</span>
                        <a href="/" className="roadmap-header__logo-text">Learnify</a>
                    </div>
                    <nav className="roadmap-header__nav">
                        <a href="/" className="roadmap-nav-link">Khóa học</a>
                        <a href="/goals" className="roadmap-nav-link">🎯 Mục tiêu</a>
                        <a href="/roadmap" className="roadmap-nav-link roadmap-nav-link--active">🗺️ Lộ trình</a>
                    </nav>
                    <div className="roadmap-header__avatar">NV</div>
                </div>
            </header>

            {goalsWithPlans.length === 0 ? (
                <div className="roadmap-empty">
                    <div className="roadmap-empty__icon">🗺️</div>
                    <h2>Chưa có lộ trình nào</h2>
                    <p>Hãy chat với AI Tutor để thiết lập mục tiêu và nhận lộ trình học tập cá nhân hóa!</p>
                    <a href="/" className="roadmap-empty__cta">💬 Chat với AI Tutor</a>
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <div className="roadmap-hero">
                        <div>
                            <h1 className="roadmap-hero__title">🗺️ Lộ trình học tập</h1>
                            <p className="roadmap-hero__subtitle">
                                Roadmap cá nhân hóa dựa trên mục tiêu và tiến độ của bạn
                            </p>
                        </div>
                        <div className="roadmap-goal-selector">
                            {goalsWithPlans.map((gwp, idx) => (
                                <button
                                    key={gwp.goal.goal_id}
                                    className={`roadmap-goal-btn ${idx === activeIdx ? "roadmap-goal-btn--active" : ""}`}
                                    onClick={() => setActiveIdx(idx)}
                                >
                                    <span>{getGoalEmoji(gwp.goal.title)}</span>
                                    {gwp.goal.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeGoal && (
                        <>
                            {/* Stats */}
                            <div className="roadmap-stats">
                                <div className="roadmap-stat-card">
                                    <div className="roadmap-stat-card__icon roadmap-stat-card__icon--purple">📊</div>
                                    <div>
                                        <p className="roadmap-stat-card__value">{getOverallProgress(activePlan)}%</p>
                                        <p className="roadmap-stat-card__label">Tiến độ tổng</p>
                                    </div>
                                </div>
                                <div className="roadmap-stat-card">
                                    <div className="roadmap-stat-card__icon roadmap-stat-card__icon--green">✅</div>
                                    <div>
                                        <p className="roadmap-stat-card__value">
                                            {getCompletedCount(activePlan)}/{activePlan?.milestones?.length || 0}
                                        </p>
                                        <p className="roadmap-stat-card__label">Giai đoạn hoàn thành</p>
                                    </div>
                                </div>
                                <div className="roadmap-stat-card">
                                    <div className="roadmap-stat-card__icon roadmap-stat-card__icon--blue">📚</div>
                                    <div>
                                        <p className="roadmap-stat-card__value">{getTotalCourses(activePlan)}</p>
                                        <p className="roadmap-stat-card__label">Khóa học</p>
                                    </div>
                                </div>
                                <div className="roadmap-stat-card">
                                    <div className="roadmap-stat-card__icon roadmap-stat-card__icon--amber">⏰</div>
                                    <div>
                                        <p className="roadmap-stat-card__value" style={{ fontSize: 16 }}>
                                            {getDeadlineCountdown(activeGoal.deadline)}
                                        </p>
                                        <p className="roadmap-stat-card__label">Deadline</p>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            {activePlan?.milestones && (
                                <div className="roadmap-timeline">
                                    <h2 className="roadmap-timeline__title">
                                        📍 Lộ trình {activeGoal.title}
                                    </h2>
                                    <div className="roadmap-timeline__track">
                                        {activePlan.milestones.map((ms) => (
                                            <div
                                                key={ms.milestone_id}
                                                className={`phase-node phase-node--${ms.status || "pending"}`}
                                            >
                                                <div className={`phase-node__dot phase-node__dot--${ms.status || "pending"}`}>
                                                    {getDotIcon(ms.status)}
                                                </div>
                                                <div className="phase-node__card">
                                                    <div className="phase-node__header">
                                                        <h3 className="phase-node__title">{ms.title}</h3>
                                                        <span className="phase-node__month">Tháng {ms.month}</span>
                                                    </div>
                                                    {ms.target && <p className="phase-node__target">{ms.target}</p>}
                                                    <div className="phase-node__progress-bar">
                                                        <div
                                                            className={`phase-node__progress-fill phase-node__progress-fill--${ms.status || "pending"}`}
                                                            style={{ width: `${ms.progress_pct || 0}%` }}
                                                        />
                                                    </div>
                                                    <div className="phase-node__courses">
                                                        {ms.courses.map(c => (
                                                            <div key={c.course_id} className="course-chip">
                                                                <span>{getCourseName(c.course_id)}</span>
                                                                <div className="course-chip__bar">
                                                                    <div
                                                                        className="course-chip__fill"
                                                                        style={{ width: `${getCourseProgress(c.course_id)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="course-chip__pct">
                                                                    {getCourseProgress(c.course_id)}%
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </main>
    );
}
