"use client";

/**
 * RoadmapDiagram v3 – Simple vertical timeline, no course catalog.
 * Each milestone shows: title, target, topics, activities, resources.
 */

import { useState } from "react";

interface Milestone {
    milestone_id?: string;
    title: string;
    month: number;
    target: string;
    status: string;
    progress_pct: number;
    topics?: string[];
    activities?: string[];
    resources?: string[];
    courses?: unknown[];  // backward compat, ignored
}

interface Props {
    milestones: Milestone[];
    goalTitle: string;
}

const STATUS: Record<string, { color: string; label: string; dot: string }> = {
    completed:   { color: "#10b981", label: "Hoàn thành",    dot: "✅" },
    in_progress: { color: "#4F46E5", label: "Đang học",      dot: "🔵" },
    pending:     { color: "#94a3b8", label: "Chưa bắt đầu",  dot: "⭕" },
};

function MilestoneCard({ ms, idx, total }: { ms: Milestone; idx: number; total: number }) {
    const [expanded, setExpanded] = useState(idx === 0);
    const st = STATUS[ms.status] || STATUS.pending;
    const isLast = idx === total - 1;

    return (
        <div style={{ display: "flex", gap: 12, marginBottom: isLast ? 0 : 8 }}>
            {/* Timeline spine */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 24 }}>
                <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `3px solid ${st.color}`,
                    background: ms.status === "completed" ? st.color : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, flexShrink: 0,
                }}>
                    {ms.status === "completed" ? "✓" : ms.status === "in_progress" ? "▶" : "○"}
                </div>
                {!isLast && (
                    <div style={{ width: 2, flex: 1, minHeight: 24, background: "#e2e8f0", marginTop: 4 }} />
                )}
            </div>

            {/* Card */}
            <div
                style={{
                    flex: 1, background: "#fff", borderRadius: 10,
                    border: `1.5px solid ${expanded ? st.color + "55" : "#e2e8f0"}`,
                    overflow: "hidden", marginBottom: isLast ? 24 : 0,
                    cursor: "pointer",
                }}
                onClick={() => setExpanded(e => !e)}
            >
                {/* Header */}
                <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        background: st.color + "18", color: st.color,
                        borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 600, flexShrink: 0,
                    }}>
                        Tháng {ms.month}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", flex: 1 }}>{ms.title}</div>
                    {ms.progress_pct > 0 && (
                        <div style={{ fontSize: 12, color: st.color, fontWeight: 700, flexShrink: 0 }}>
                            {ms.progress_pct}%
                        </div>
                    )}
                    <div style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</div>
                </div>

                {/* Progress bar */}
                {ms.progress_pct > 0 && (
                    <div style={{ height: 3, background: "#f1f5f9", margin: "0 12px" }}>
                        <div style={{ height: "100%", width: `${ms.progress_pct}%`, background: st.color, borderRadius: 2 }} />
                    </div>
                )}

                {/* Expanded body */}
                {expanded && (
                    <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 8 }}>
                        {ms.target && (
                            <div style={{ fontSize: 12, color: "#475569" }}>
                                🎯 <strong>Mục tiêu:</strong> {ms.target}
                            </div>
                        )}

                        {ms.topics && ms.topics.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>📚 Chủ đề học</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {ms.topics.map((t, i) => (
                                        <span key={i} style={{
                                            background: "#ede9fe", color: "#5b21b6",
                                            borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 500,
                                        }}>{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ms.activities && ms.activities.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>🏃 Hoạt động</div>
                                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                                    {ms.activities.map((a, i) => (
                                        <li key={i} style={{ fontSize: 11, color: "#475569" }}>{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {ms.resources && ms.resources.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>🔗 Tài nguyên</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {ms.resources.map((r, i) => (
                                        <span key={i} style={{
                                            background: "#ecfdf5", color: "#065f46",
                                            borderRadius: 6, padding: "2px 8px", fontSize: 11, border: "1px solid #a7f3d0",
                                        }}>{r}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Status badge */}
                        <div style={{ marginTop: 2 }}>
                            <span style={{
                                fontSize: 11, color: st.color, background: st.color + "15",
                                padding: "2px 8px", borderRadius: 6, fontWeight: 600,
                            }}>
                                {st.dot} {st.label}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RoadmapDiagram({ milestones, goalTitle }: Props) {
    const sorted = [...milestones].sort((a, b) => a.month - b.month);

    if (milestones.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#475569" }}>Chưa có lộ trình</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Chat với AI để tạo lộ trình cá nhân hóa!</div>
            </div>
        );
    }

    const done = milestones.filter(m => m.status === "completed").length;
    const totalPct = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0;

    return (
        <div style={{ padding: "12px 4px" }}>
            {/* Goal banner */}
            <div style={{
                background: "linear-gradient(135deg, #4F46E5 0%, #7c3aed 100%)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#fff",
                display: "flex", alignItems: "center", gap: 12,
            }}>
                <span style={{ fontSize: 24 }}>🎯</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{goalTitle}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                        {done}/{milestones.length} milestones · {totalPct}% hoàn thành
                    </div>
                </div>
            </div>

            {/* Milestones */}
            {sorted.map((ms, idx) => (
                <MilestoneCard key={ms.milestone_id || idx} ms={ms} idx={idx} total={sorted.length} />
            ))}

            {/* Finish node */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", paddingLeft: 0 }}>
                <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
                    <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: totalPct === 100 ? "#10b981" : "#e2e8f0",
                        border: `3px solid ${totalPct === 100 ? "#10b981" : "#cbd5e0"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                    }}>
                        {totalPct === 100 ? "🏁" : "○"}
                    </div>
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                    {totalPct === 100 ? "🎉 Hoàn thành mục tiêu!" : "🏁 Đích đến"}
                </div>
            </div>
        </div>
    );
}
