"use client";

/**
 * Learnify – Trang chính (Dynamic)
 * Hiện 22 khóa học từ 3 môn (Toán, IELTS, Python)
 * Click khóa → hiện nội dung + truyền context vào chat
 */

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Course {
    course_id: string;
    title: string;
    category: string;
    level: string;
    duration_hours: number;
    description: string;
    skills: string[];
}

interface CourseProgress {
    course_id: string;
    percent_complete: number;
}

const CATEGORY_META: Record<string, { icon: string; color: string; gradient: string }> = {
    "Toán": { icon: "📐", color: "#E74C3C", gradient: "linear-gradient(135deg, #E74C3C, #C0392B)" },
    "IELTS": { icon: "🌍", color: "#3498DB", gradient: "linear-gradient(135deg, #3498DB, #2980B9)" },
    "Python": { icon: "🐍", color: "#27AE60", gradient: "linear-gradient(135deg, #27AE60, #219A52)" },
};

const LEVEL_BADGE: Record<string, { bg: string; text: string }> = {
    "Beginner": { bg: "#E8F5E9", text: "#2E7D32" },
    "Intermediate": { bg: "#FFF3E0", text: "#E65100" },
    "Advanced": { bg: "#FCE4EC", text: "#C62828" },
};

export default function TrangChu() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [progress, setProgress] = useState<CourseProgress[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [hienSidebar, setHienSidebar] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [coursesRes, progressRes] = await Promise.all([
                fetch(`${API_URL}/api/courses`),
                fetch(`${API_URL}/api/progress/default`).catch(() => null),
            ]);
            if (coursesRes.ok) {
                const data = await coursesRes.json();
                setCourses(data.courses || []);
            }
            if (progressRes?.ok) {
                const data = await progressRes.json();
                setProgress(data.progress || []);
            }
        } catch (err) {
            console.error("Lỗi tải dữ liệu:", err);
        } finally {
            setLoading(false);
        }
    };

    const getProgress = (courseId: string) => {
        const p = progress.find(p => p.course_id === courseId);
        return p ? p.percent_complete : 0;
    };

    const categories = ["all", ...Array.from(new Set(courses.map(c => c.category)))];
    const filtered = activeCategory === "all" ? courses : courses.filter(c => c.category === activeCategory);

    // Dispatch custom event khi chọn khóa → SplitLayout/ChatPanel sẽ lắng nghe
    const selectCourse = (course: Course) => {
        setSelectedCourse(course);
        const ctx = {
            courseId: course.course_id,
            title: course.title,
            category: course.category,
            description: course.description,
            progress: getProgress(course.course_id),
        };
        // Lưu vào window global để ChatPanel đọc được khi mount
        (window as any).__learnifyContext = ctx;
        window.dispatchEvent(new CustomEvent("learnify:course-context", { detail: ctx }));
    };

    return (
        <main style={styles.main}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.logo}>
                        <span style={{ fontSize: 24 }}>🎓</span>
                        <h1 style={styles.logoText}>Learnify</h1>
                    </div>
                    <nav style={styles.nav}>
                        <a href="/" style={{ ...styles.navLink, color: '#4A90D9', fontWeight: 600 }}>Khóa học</a>
                        <a href="/goals" style={{ ...styles.navLink, color: '#7C6FE0', fontWeight: 600 }}>🎯 Mục tiêu</a>
                        <a href="/roadmap" style={styles.navLink}>🗺️ Lộ trình</a>
                    </nav>
                    <div style={styles.avatar}>NV</div>
                </div>
            </header>

            <div style={styles.content}>
                {/* Toggle sidebar button */}
                {!hienSidebar && (
                    <button
                        onClick={() => setHienSidebar(true)}
                        style={styles.sidebarToggleCollapsed}
                        title="Hiện khóa đang học"
                    >
                        📚
                        <span style={{ fontSize: 10, marginTop: 2 }}>›</span>
                    </button>
                )}

                {/* Sidebar: Khóa đang học */}
                {hienSidebar && (
                    <aside style={styles.sidebar}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <h3 style={styles.sidebarTitle}>📚 Khóa đang học</h3>
                            <button
                                onClick={() => setHienSidebar(false)}
                                style={styles.sidebarToggle}
                                title="Ẩn sidebar"
                            >«</button>
                        </div>
                        {progress.filter(p => p.percent_complete > 0 && p.percent_complete < 100).slice(0, 5).map(p => {
                            const course = courses.find(c => c.course_id === p.course_id);
                            if (!course) return null;
                            const meta = CATEGORY_META[course.category] || CATEGORY_META["IELTS"];
                            return (
                                <button key={p.course_id} style={styles.courseCard} onClick={() => selectCourse(course)}>
                                    <div style={{ ...styles.courseIcon, background: meta.gradient }}>{meta.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={styles.courseName}>{course.title}</p>
                                        <div style={styles.progressBar}>
                                            <div style={{ ...styles.progressFill, width: `${p.percent_complete}%` }}></div>
                                        </div>
                                        <p style={styles.progressText}>{p.percent_complete}% hoàn thành</p>
                                    </div>
                                </button>
                            );
                        })}
                        {progress.filter(p => p.percent_complete >= 100).length > 0 && (
                            <>
                                <h4 style={{ fontSize: 13, color: "#64748B", margin: "12px 0 4px" }}>✅ Đã hoàn thành</h4>
                                {progress.filter(p => p.percent_complete >= 100).slice(0, 3).map(p => {
                                    const course = courses.find(c => c.course_id === p.course_id);
                                    if (!course) return null;
                                    return (
                                        <button key={p.course_id} style={{ ...styles.courseCard, opacity: 0.7 }} onClick={() => selectCourse(course)}>
                                            <div style={{ fontSize: 20 }}>✅</div>
                                            <p style={{ ...styles.courseName, margin: 0 }}>{course.title}</p>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </aside>
                )}

                {/* Main content */}
                <section style={styles.mainArea}>
                    {/* Category Tabs */}
                    <div style={styles.tabs}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                    ...styles.tab,
                                    ...(activeCategory === cat ? styles.tabActive : {}),
                                    ...(cat !== "all" && CATEGORY_META[cat] && activeCategory === cat
                                        ? { background: CATEGORY_META[cat].gradient, color: "white" }
                                        : {}),
                                }}
                            >
                                {cat === "all" ? "📋 Tất cả" : `${CATEGORY_META[cat]?.icon || ""} ${cat}`}
                            </button>
                        ))}
                    </div>

                    {/* Selected course detail */}
                    {selectedCourse ? (
                        <div style={styles.courseDetail}>
                            <button style={styles.backBtn} onClick={() => setSelectedCourse(null)}>← Quay lại</button>
                            <div style={styles.courseDetailHeader}>
                                <div style={{
                                    ...styles.detailBadge,
                                    background: CATEGORY_META[selectedCourse.category]?.gradient,
                                }}>
                                    {CATEGORY_META[selectedCourse.category]?.icon} {selectedCourse.category}
                                </div>
                                <span style={{
                                    ...styles.levelBadge,
                                    background: LEVEL_BADGE[selectedCourse.level]?.bg,
                                    color: LEVEL_BADGE[selectedCourse.level]?.text,
                                }}>{selectedCourse.level}</span>
                            </div>
                            <h2 style={styles.detailTitle}>{selectedCourse.title}</h2>
                            <p style={styles.detailDesc}>{selectedCourse.description}</p>
                            <div style={styles.detailMeta}>
                                <span>⏱ {selectedCourse.duration_hours} giờ</span>
                                <span>📊 Tiến độ: {getProgress(selectedCourse.course_id)}%</span>
                            </div>
                            <div style={styles.detailProgress}>
                                <div style={{ ...styles.progressFill, width: `${getProgress(selectedCourse.course_id)}%` }}></div>
                            </div>
                            <div style={styles.videoPlaceholder}>
                                <span style={{ fontSize: 48 }}>▶️</span>
                                <p style={{ margin: 0, color: "#94A3B8" }}>Video bài giảng</p>
                            </div>
                            <div style={styles.callout}>
                                <p>💡 <strong>Mẹo:</strong> Hãy mở <strong>Chat AI</strong> bên phải để hỏi Tutor về "{selectedCourse.title}"! AI sẽ biết bạn đang học khóa này.</p>
                            </div>
                        </div>
                    ) : (
                        /* Course Grid */
                        <div style={styles.courseGrid}>
                            {loading ? (
                                <p style={{ textAlign: "center", color: "#94A3B8", padding: 40 }}>Đang tải...</p>
                            ) : filtered.length === 0 ? (
                                <p style={{ textAlign: "center", color: "#94A3B8", padding: 40 }}>Không có khóa học nào</p>
                            ) : filtered.map(course => {
                                const meta = CATEGORY_META[course.category] || CATEGORY_META["IELTS"];
                                const prog = getProgress(course.course_id);
                                return (
                                    <button key={course.course_id} style={styles.gridCard} onClick={() => selectCourse(course)}>
                                        <div style={{ ...styles.gridCardTop, background: meta.gradient }}>
                                            <span style={{ fontSize: 28 }}>{meta.icon}</span>
                                            <span style={{
                                                ...styles.levelBadge,
                                                background: "rgba(255,255,255,0.2)",
                                                color: "white",
                                                fontSize: 10,
                                            }}>{course.level}</span>
                                        </div>
                                        <div style={styles.gridCardBody}>
                                            <h4 style={styles.gridCardTitle}>{course.title}</h4>
                                            <p style={styles.gridCardDesc}>{course.description}</p>
                                            <div style={styles.gridCardFooter}>
                                                <span style={styles.gridCardMeta}>⏱ {course.duration_hours}h</span>
                                                {prog > 0 && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <div style={{ ...styles.miniProgress, width: 50 }}>
                                                            <div style={{ ...styles.progressFill, width: `${prog}%` }}></div>
                                                        </div>
                                                        <span style={{ fontSize: 11, color: "#64748B" }}>{prog}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

// ===== Styles =====
const styles: Record<string, React.CSSProperties> = {
    main: { minHeight: "100vh", background: "#F0F4F8" },
    header: { background: "white", borderBottom: "1px solid #E2E8F0", padding: "12px 24px", position: "sticky" as const, top: 0, zIndex: 100 },
    headerContent: { display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1400, margin: "0 auto" },
    logo: { display: "flex", alignItems: "center", gap: 8 },
    logoText: { fontSize: 20, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #4A90D9, #357ABD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    nav: { display: "flex", gap: 24 },
    navLink: { fontSize: 14, fontWeight: 500, color: "#64748B", cursor: "pointer", textDecoration: "none" },
    avatar: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4A90D9, #357ABD)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 },
    content: { display: "flex", maxWidth: 1400, margin: "0 auto", padding: "24px", gap: 24 },
    sidebar: { width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 },
    sidebarTitle: { fontSize: 16, fontWeight: 600, margin: 0 },
    sidebarToggle: { width: 28, height: 28, border: "1px solid #E2E8F0", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 14, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", transition: "all 0.15s" },
    sidebarToggleCollapsed: { width: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 0", background: "white", border: "1px solid #E2E8F0", borderRadius: 10, cursor: "pointer", fontSize: 18, fontFamily: "inherit", flexShrink: 0, color: "#64748B", transition: "all 0.15s" },
    courseCard: { display: "flex", gap: 10, padding: 12, background: "white", borderRadius: 10, border: "1px solid #E2E8F0", alignItems: "center", cursor: "pointer", width: "100%", textAlign: "left" as const, transition: "all 0.15s", fontFamily: "inherit" },
    courseIcon: { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, color: "white" },
    courseName: { fontSize: 12, fontWeight: 600, margin: "0 0 4px", color: "#1E293B", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
    progressBar: { height: 5, background: "#E2E8F0", borderRadius: 10, overflow: "hidden", marginBottom: 3 },
    progressFill: { height: "100%", background: "linear-gradient(90deg, #4A90D9, #357ABD)", borderRadius: 10, transition: "width 0.5s ease" },
    progressText: { fontSize: 10, color: "#64748B", margin: 0 },
    mainArea: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 },
    tabs: { display: "flex", gap: 8, flexWrap: "wrap" as const },
    tab: { padding: "8px 18px", borderRadius: 20, borderWidth: 1, borderStyle: "solid" as const, borderColor: "#E2E8F0", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#64748B", fontFamily: "inherit", transition: "all 0.15s" },
    tabActive: { borderColor: "#4A90D9", color: "#4A90D9", fontWeight: 600 },
    courseGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 },
    gridCard: { background: "white", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit", transition: "all 0.2s", padding: 0 },
    gridCardTop: { padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    gridCardBody: { padding: "14px 18px 18px" },
    gridCardTitle: { fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: "#1E293B", lineHeight: 1.3 },
    gridCardDesc: { fontSize: 12, color: "#64748B", margin: "0 0 10px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" },
    gridCardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    gridCardMeta: { fontSize: 11, color: "#94A3B8" },
    miniProgress: { height: 4, background: "#E2E8F0", borderRadius: 10, overflow: "hidden" },
    levelBadge: { padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 },
    backBtn: { padding: "6px 14px", background: "white", border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#64748B", marginBottom: 12 },
    courseDetail: { display: "flex", flexDirection: "column", gap: 12 },
    courseDetailHeader: { display: "flex", gap: 10, alignItems: "center" },
    detailBadge: { padding: "6px 16px", borderRadius: 20, color: "white", fontSize: 13, fontWeight: 600 },
    detailTitle: { fontSize: 24, fontWeight: 700, margin: 0, color: "#1E293B" },
    detailDesc: { fontSize: 15, color: "#475569", lineHeight: 1.7, margin: 0 },
    detailMeta: { display: "flex", gap: 20, fontSize: 14, color: "#64748B" },
    detailProgress: { height: 8, background: "#E2E8F0", borderRadius: 10, overflow: "hidden" },
    videoPlaceholder: { width: "100%", aspectRatio: "16/9", background: "linear-gradient(135deg, #1E293B, #334155)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "white" },
    callout: { background: "#EBF3FC", border: "1px solid #BFDBFE", borderRadius: 12, padding: 16, fontSize: 14, lineHeight: 1.6 },
};
