/**
 * Learnify – Goals Page
 * Trang Mục tiêu: hiển thị nhiều goals, milestones, tiến độ khóa học
 */

"use client";

import { useEffect, useState } from "react";
import ChatPanelWrapper from "../components/chat/ChatPanelWrapper";
import "./goals.css";

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
    daily_hours?: number;
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

const GOAL_EMOJIS: Record<string, string> = {
    "Toán": "📐",
    "IELTS": "🌍",
    "Python": "🐍",
};

function getGoalEmoji(title: string): string {
    for (const [key, emoji] of Object.entries(GOAL_EMOJIS)) {
        if (title.toLowerCase().includes(key.toLowerCase())) return emoji;
    }
    return "🎯";
}

export default function GoalsPage() {
    const [goalsWithPlans, setGoalsWithPlans] = useState<GoalWithPlan[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});
    const [courses, setCourses] = useState<CourseInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [courseRes, goalRes, progressRes] = await Promise.all([
                fetch(`${API_URL}/api/courses`),
                fetch(`${API_URL}/api/goals`),
                fetch(`${API_URL}/api/progress`),
            ]);

            if (courseRes.ok) {
                const d = await courseRes.json();
                setCourses(d.courses || []);
            }

            if (progressRes.ok) {
                const d = await progressRes.json();
                setCourseProgress(d.progress || {});
            }

            if (goalRes.ok) {
                const d = await goalRes.json();
                const gs: Goal[] = d.goals || [];

                // Fetch plans cho mỗi goal
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

    const getCourseName = (courseId: string) => {
        const c = courses.find((x) => x.course_id === courseId);
        return c?.title || courseId;
    };

    const getCourseProgress = (courseId: string) => courseProgress[courseId] || 0;

    const getOverallProgress = (plan: Plan | null) => {
        if (!plan?.milestones?.length) return 0;
        const total = plan.milestones.length;
        const sum = plan.milestones.reduce((acc, ms) => acc + (ms.progress_pct || 0), 0);
        return Math.round(sum / total);
    };

    const getDeadlineCountdown = (deadline?: string) => {
        if (!deadline) return "";
        const d = new Date(deadline);
        const now = new Date();
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return "Đã quá hạn";
        const months = Math.floor(diffDays / 30);
        const days = diffDays % 30;
        return months > 0 ? `Còn ${months} tháng ${days} ngày` : `Còn ${days} ngày`;
    };

    const getMilestoneIcon = (status: string) => {
        switch (status) {
            case "completed": return "✅";
            case "in_progress": return "🔵";
            default: return "⚪";
        }
    };

    const activeGwp = goalsWithPlans[activeIdx] || null;
    const activeGoal = activeGwp?.goal || null;
    const activePlan = activeGwp?.plan || null;

    if (loading) {
        return (
            <main className="goals-page">
                <div className="goals-loading">
                    <div className="goals-loading__spinner" />
                    <p>Đang tải...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="goals-page">
            {/* Header */}
            <header className="goals-header">
                <div className="goals-header__content">
                    <div className="goals-header__logo">
                        <span style={{ fontSize: 24 }}>🎓</span>
                        <a href="/" className="goals-header__logo-text">Learnify</a>
                    </div>
                    <nav className="goals-header__nav">
                        <a href="/" className="goals-nav-link">Khóa học</a>
                        <a href="/goals" className="goals-nav-link goals-nav-link--active">Mục tiêu</a>
                        <a href="/roadmap" className="goals-nav-link">🗺️ Lộ trình</a>
                    </nav>
                    <div className="goals-header__avatar">NV</div>
                </div>
            </header>

            <div className="goals-content">
                {goalsWithPlans.length === 0 ? (
                    <div className="goals-empty">
                        <div className="goals-empty__icon">🎯</div>
                        <h2>Chưa có mục tiêu nào</h2>
                        <p>Hãy chat với AI Tutor để thiết lập mục tiêu và lộ trình học tập cá nhân hóa!</p>
                        <p className="goals-empty__hint">Thử nói: &quot;Tôi muốn đạt IELTS 6.5 trong 6 tháng&quot;</p>
                    </div>
                ) : (
                    <>
                        {/* Goal Tabs */}
                        <div className="goal-tabs">
                            {goalsWithPlans.map((gwp, idx) => (
                                <button
                                    key={gwp.goal.goal_id}
                                    className={`goal-tab ${idx === activeIdx ? "goal-tab--active" : ""}`}
                                    onClick={() => setActiveIdx(idx)}
                                >
                                    <span className="goal-tab__emoji">{getGoalEmoji(gwp.goal.title)}</span>
                                    <span className="goal-tab__text">{gwp.goal.title}</span>
                                    <span className="goal-tab__pct">{getOverallProgress(gwp.plan)}%</span>
                                </button>
                            ))}
                        </div>

                        {activeGoal && (
                            <>
                                {/* Goal Summary Card */}
                                <div className="goal-summary">
                                    <div className="goal-summary__main">
                                        <div className="goal-summary__info">
                                            <h1 className="goal-summary__title">
                                                {getGoalEmoji(activeGoal.title)} {activeGoal.title}
                                            </h1>
                                            <div className="goal-summary__stats">
                                                {activeGoal.deadline && (
                                                    <span className="goal-stat">
                                                        ⏰ {getDeadlineCountdown(activeGoal.deadline)}
                                                    </span>
                                                )}
                                                {activePlan?.milestones && (
                                                    <span className="goal-stat">
                                                        📚 {activePlan.milestones.reduce((a, ms) => a + ms.courses.length, 0)} khóa học
                                                    </span>
                                                )}
                                                {activeGoal.weekly_hours && (
                                                    <span className="goal-stat">
                                                        ⏱ {activeGoal.weekly_hours}h/tuần
                                                    </span>
                                                )}
                                                {activeGoal.current_level && (
                                                    <span className="goal-stat">
                                                        📊 Hiện tại: {activeGoal.current_level}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="goal-summary__progress-ring">
                                            <svg viewBox="0 0 120 120">
                                                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(124,111,224,0.15)" strokeWidth="8" />
                                                <circle
                                                    cx="60" cy="60" r="54" fill="none"
                                                    stroke="#7C6FE0" strokeWidth="8"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${2 * Math.PI * 54}`}
                                                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - getOverallProgress(activePlan) / 100)}`}
                                                    transform="rotate(-90 60 60)"
                                                />
                                            </svg>
                                            <span className="goal-summary__progress-text">
                                                {getOverallProgress(activePlan)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Milestone Timeline */}
                                {activePlan?.milestones && (
                                    <div className="milestone-timeline">
                                        <h2 className="milestone-timeline__title">Lộ trình học tập</h2>
                                        {activePlan.milestones.map((ms, idx) => (
                                            <div
                                                key={ms.milestone_id}
                                                className={`milestone-card milestone-card--${ms.status || "pending"}`}
                                            >
                                                <div className="milestone-card__connector">
                                                    <span className="milestone-card__icon">
                                                        {getMilestoneIcon(ms.status)}
                                                    </span>
                                                    {idx < activePlan.milestones.length - 1 && (
                                                        <div className="milestone-card__line" />
                                                    )}
                                                </div>
                                                <div className="milestone-card__content">
                                                    <div className="milestone-card__header">
                                                        <h3 className="milestone-card__title">{ms.title}</h3>
                                                        <span className="milestone-card__month">Tháng {ms.month}</span>
                                                    </div>
                                                    {ms.target && <p className="milestone-card__target">{ms.target}</p>}
                                                    <div className="milestone-card__courses">
                                                        {ms.courses.map((c) => {
                                                            const pct = getCourseProgress(c.course_id);
                                                            return (
                                                                <div key={c.course_id} className="course-row">
                                                                    <span className="course-row__name">{getCourseName(c.course_id)}</span>
                                                                    <div className="course-row__bar">
                                                                        <div className="course-row__fill" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                    <span className="course-row__pct">{pct}%</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            <ChatPanelWrapper />
        </main>
    );
}
