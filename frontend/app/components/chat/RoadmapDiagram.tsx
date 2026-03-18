"use client";

/**
 * RoadmapDiagram v2 – roadmap.sh-style branching layout.
 *
 * Layout concept:
 * - Center vertical spine (milestone nodes)
 * - Each milestone branches courses into LEFT (odd priority) and RIGHT (even priority) columns
 * - Categories are shown as grouped colored boxes
 * - Dashed connector lines link milestone → courses
 * - Clicking a course opens slide-in detail panel
 */

import { useState, useEffect, useRef, useLayoutEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ===== Types =====
interface Course {
    course_id: string;
    title: string;
    category: string;
    level: string;
    duration_hours: number;
    description: string;
    skills?: string[];
    prerequisites?: string[];
}

interface Milestone {
    milestone_id?: string;
    title: string;
    month: number;
    target: string;
    status: string;
    progress_pct: number;
    courses: { course_id: string; priority: number }[];
}

interface Props {
    milestones: Milestone[];
    goalTitle: string;
}

// ===== Color helpers =====
const LEVEL_COLOR: Record<string, { bg: string; text: string; border: string }> = {
    Beginner:     { bg: "#dcfce7", text: "#166534", border: "#86efac" },
    Intermediate: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
    Advanced:     { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

const STATUS: Record<string, { color: string; label: string; dot: string }> = {
    completed:   { color: "#10b981", label: "Hoành thành", dot: "✅" },
    in_progress: { color: "#4F46E5", label: "Đang học",    dot: "🔵" },
    pending:     { color: "#94a3b8", label: "Chưa bắt đầu", dot: "⭕" },
};

// ===== Course Detail Panel =====
function CoursePanel({ course, onClose }: { course: Course; onClose: () => void }) {
    const lvl = LEVEL_COLOR[course.level] || LEVEL_COLOR["Intermediate"];
    return (
        <>
            <div className="rdm-panel-overlay" onClick={onClose} />
            <div className="rdm-panel">
                <div className="rdm-panel__header">
                    <div>
                        <span className="rdm-panel__category">{course.category}</span>
                        <span className="rdm-panel__level" style={{ background: lvl.bg, color: lvl.text }}>
                            {course.level}
                        </span>
                    </div>
                    <button className="rdm-panel__close" onClick={onClose}>✕</button>
                </div>
                <h2 className="rdm-panel__title">{course.title}</h2>
                <div className="rdm-panel__meta">
                    <span>⏱ {course.duration_hours}h</span>
                    {course.prerequisites && course.prerequisites.length > 0 && (
                        <span>📌 Yêu cầu: {course.prerequisites.join(", ")}</span>
                    )}
                </div>
                <p className="rdm-panel__desc">{course.description}</p>
                {course.skills && course.skills.length > 0 && (
                    <div className="rdm-panel__skills-section">
                        <div className="rdm-panel__skills-label">🎯 Kỹ năng đạt được</div>
                        <div className="rdm-panel__skills">
                            {course.skills.map(s => (
                                <span key={s} className="rdm-panel__skill-chip">{s}</span>
                            ))}
                        </div>
                    </div>
                )}
                <div className="rdm-panel__section-divider"><span>📚 Khóa học Learnify</span></div>
                <div className="rdm-panel__course-card">
                    <div className="rdm-panel__course-icon">📖</div>
                    <div>
                        <div className="rdm-panel__course-name">{course.title}</div>
                        <div className="rdm-panel__course-meta">{course.category} · {course.level} · {course.duration_hours}h</div>
                    </div>
                    <span className="rdm-panel__course-badge">Learnify</span>
                </div>
                <button className="rdm-panel__enroll-btn">🚀 Bắt đầu học ngay</button>
            </div>
        </>
    );
}

// ===== Course Box (branch node) =====
function CourseBox({
    courseRef,
    catalog,
    side,
    onClick,
    elRef,
}: {
    courseRef: { course_id: string; priority: number };
    catalog: Record<string, Course>;
    side: "left" | "right";
    onClick: (c: Course) => void;
    elRef?: React.RefCallback<HTMLButtonElement>;
}) {
    const course = catalog[courseRef.course_id];
    const lvl = course ? (LEVEL_COLOR[course.level] || LEVEL_COLOR["Intermediate"]) : null;
    return (
        <button
            ref={elRef}
            className={`rdm2-course-box rdm2-course-box--${side} ${course ? "" : "rdm2-course-box--unknown"}`}
            style={lvl ? { borderColor: lvl.border, background: lvl.bg } : {}}
            onClick={() => course && onClick(course)}
            title={course ? course.description : courseRef.course_id}
        >
            <div className="rdm2-course-box__row">
                <span className="rdm2-course-box__icon">\ud83d\udcda</span>
                <span className="rdm2-course-box__name">
                    {course ? course.title : courseRef.course_id}
                </span>
            </div>
            {lvl && (
                <span className="rdm2-course-box__badge" style={{ background: lvl.border, color: lvl.text }}>
                    {course?.level}
                </span>
            )}
        </button>
    );
}

// ===== Milestone Row (curved SVG connectors via imperative DOM) =====
function MilestoneRow({
    ms,
    catalog,
    isLast,
    isFirst,
    onCourse,
}: {
    ms: Milestone;
    catalog: Record<string, Course>;
    isLast: boolean;
    isFirst: boolean;
    onCourse: (c: Course) => void;
}) {
    const st = STATUS[ms.status] || STATUS.pending;
    const sorted = [...ms.courses].sort((a, b) => a.priority - b.priority);
    const leftCourses  = sorted.filter((_, i) => i % 2 === 0);
    const rightCourses = sorted.filter((_, i) => i % 2 === 1);

    const rowRef      = useRef<HTMLDivElement>(null);
    const msRef       = useRef<HTMLDivElement>(null);
    const svgRef      = useRef<SVGSVGElement>(null);
    const leftBoxRefs  = useRef<HTMLButtonElement[]>([]);
    const rightBoxRefs = useRef<HTMLButtonElement[]>([]);

    // Draw SVG paths imperatively — no setState, no re-render loop
    const drawPaths = () => {
        const svg = svgRef.current;
        const row = rowRef.current;
        const ms0 = msRef.current;
        if (!svg || !row || !ms0) return;

        const R  = row.getBoundingClientRect();
        const M  = ms0.getBoundingClientRect();
        const mL = M.left  - R.left;
        const mR = M.right - R.left;
        const mY = M.top + M.height / 2 - R.top;

        let pathsHTML = "";

        leftBoxRefs.current.forEach(el => {
            if (!el) return;
            const B  = el.getBoundingClientRect();
            const x1 = B.right - R.left;
            const y1 = B.top + B.height / 2 - R.top;
            const cx = x1 + (mL - x1) * 0.5;
            pathsHTML += `<path d="M${x1},${y1} C${cx},${y1} ${cx},${mY} ${mL},${mY}"
                fill="none" stroke="#A5B4FC" stroke-width="2"
                stroke-dasharray="6,4" stroke-linecap="round"/>`;
        });

        rightBoxRefs.current.forEach(el => {
            if (!el) return;
            const B  = el.getBoundingClientRect();
            const x2 = B.left - R.left;
            const y2 = B.top + B.height / 2 - R.top;
            const cx = mR + (x2 - mR) * 0.5;
            pathsHTML += `<path d="M${mR},${mY} C${cx},${mY} ${cx},${y2} ${x2},${y2}"
                fill="none" stroke="#A5B4FC" stroke-width="2"
                stroke-dasharray="6,4" stroke-linecap="round"/>`;
        });

        svg.innerHTML = pathsHTML;
    };

    useLayoutEffect(() => {
        // Small delay lets flexbox finish layout before measuring
        const timer = setTimeout(drawPaths, 0);
        window.addEventListener("resize", drawPaths);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", drawPaths);
        };
    // Redraw when catalog loads (boxes change size) or course list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Object.keys(catalog).length, ms.courses.length]);

    return (
        <div className="rdm2-ms-row" ref={rowRef} style={{ position: "relative" }}>
            {/* SVG overlay — updated imperatively, never via React state */}
            <svg
                ref={svgRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                         overflow: "visible", pointerEvents: "none", zIndex: 1 }}
                aria-hidden="true"
            />

            {/* LEFT column */}
            <div className="rdm2-col rdm2-col--left">
                {leftCourses.map((cr, i) => (
                    <CourseBox
                        key={cr.course_id}
                        courseRef={cr}
                        catalog={catalog}
                        side="left"
                        onClick={onCourse}
                        elRef={el => { if (el) leftBoxRefs.current[i] = el; }}
                    />
                ))}
            </div>

            {/* CENTER spine */}
            <div className={`rdm2-spine ${isFirst ? "rdm2-spine--first" : ""} ${isLast ? "rdm2-spine--last" : ""}`}>
                <div
                    className="rdm2-ms-node"
                    ref={msRef}
                    style={{ borderColor: st.color, boxShadow: `0 0 0 3px ${st.color}22` }}
                >
                    <div className="rdm2-ms-node__dot" style={{ background: st.color }} />
                    <div className="rdm2-ms-node__body">
                        <span className="rdm2-ms-node__title">{ms.title}</span>
                        <div className="rdm2-ms-node__meta">
                            <span style={{ color: st.color }}>Tháng {ms.month}</span>
                            {ms.progress_pct > 0 && (
                                <span className="rdm2-ms-node__pct" style={{ color: st.color }}>
                                    {ms.progress_pct}%
                                </span>
                            )}
                        </div>
                        {ms.target && (
                            <div className="rdm2-ms-node__target">{ms.target}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT column */}
            <div className="rdm2-col rdm2-col--right">
                {rightCourses.map((cr, i) => (
                    <CourseBox
                        key={cr.course_id}
                        courseRef={cr}
                        catalog={catalog}
                        side="right"
                        onClick={onCourse}
                        elRef={el => { if (el) rightBoxRefs.current[i] = el; }}
                    />
                ))}
            </div>
        </div>
    );
}

// ===== Main Diagram =====
export default function RoadmapDiagram({ milestones, goalTitle }: Props) {
    const [catalog, setCatalog] = useState<Record<string, Course>>({});
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/courses`)
            .then(r => r.json())
            .then(d => {
                const map: Record<string, Course> = {};
                (d.courses || []).forEach((c: Course) => { map[c.course_id] = c; });
                setCatalog(map);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="rdm-loading">Đang tải danh mục khóa học...</div>;

    const sorted = [...milestones].sort((a, b) => a.month - b.month);

    return (
        <div className="rdm2-wrapper">
            {/* Goal header */}
            <div className="rdm2-goal-header">
                <div className="rdm2-goal-header__badge">🎯 Mục tiêu</div>
                <h2 className="rdm2-goal-header__title">{goalTitle}</h2>
            </div>

            {/* Legend */}
            <div className="rdm2-legend">
                {Object.entries(STATUS).map(([k, v]) => (
                    <span key={k} className="rdm2-legend-item">
                        <span style={{ color: v.color }}>●</span> {v.label}
                    </span>
                ))}
            </div>

            {/* Diagram grid */}
            <div className="rdm2-diagram">
                {/* Single continuous bold spine track — runs through entire diagram */}
                <div className="rdm2-spine-track" />

                {sorted.map((ms, idx) => (
                    <MilestoneRow
                        key={ms.milestone_id || idx}
                        ms={ms}
                        catalog={catalog}
                        isFirst={idx === 0}
                        isLast={idx === sorted.length - 1}
                        onCourse={setSelectedCourse}
                    />
                ))}

                {/* End node */}
                <div className="rdm2-ms-row">
                    <div className="rdm2-col rdm2-col--left" />
                    <div className="rdm2-spine">
                        <div className="rdm2-end-node">🏁 Hoàn thành</div>
                    </div>
                    <div className="rdm2-col rdm2-col--right" />
                </div>
            </div>

            {selectedCourse && (
                <CoursePanel course={selectedCourse} onClose={() => setSelectedCourse(null)} />
            )}
        </div>
    );
}
