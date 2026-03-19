"use client";

/**
 * RoadmapDiagram v4 — Vertical timeline + clickable resource detail panel.
 * Resources can be string (backward compat) or rich object {name,type,url,description,skills}.
 */

import { useState } from "react";

// ===== Types =====
interface Resource {
    name: string;
    type?: string;  // book | website | video | app | course | tool
    url?: string;
    description?: string;
    skills?: string[];
}

interface Milestone {
    milestone_id?: string;
    title: string;
    month: number;
    target: string;
    status: string;
    progress_pct: number;
    topics?: string[];
    activities?: string[];
    resources?: (Resource | string)[];
    courses?: unknown[];
}

interface Props {
    milestones: Milestone[];
    goalTitle: string;
}

// ===== Helpers =====
const STATUS: Record<string, { color: string; label: string }> = {
    completed:   { color: "#10b981", label: "✅ Hoàn thành" },
    in_progress: { color: "#4F46E5", label: "🔵 Đang học" },
    pending:     { color: "#94a3b8", label: "⭕ Chưa bắt đầu" },
};

const TYPE_ICON: Record<string, string> = {
    book: "📚", website: "🌐", video: "🎥", app: "📱", course: "🎓", tool: "🔧",
};

function normalizeResource(r: Resource | string): Resource {
    if (typeof r === "string") return { name: r };
    return r;
}

// ===== Resource Detail Panel =====
function ResourcePanel({ resource, onClose }: { resource: Resource; onClose: () => void }) {
    const icon = TYPE_ICON[resource.type || ""] || "📄";
    const typeLabel: Record<string, string> = {
        book: "Sách", website: "Website", video: "Video", app: "Ứng dụng", course: "Khóa học", tool: "Công cụ",
    };
    return (
        <>
            <div
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100 }}
                onClick={onClose}
            />
            <div style={{
                position: "fixed", right: 0, top: 0, bottom: 0, width: 320, maxWidth: "92vw",
                background: "#fff", zIndex: 101, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
                display: "flex", flexDirection: "column", overflowY: "auto",
            }}>
                {/* Header */}
                <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 10, background: "#f1f5f9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, flexShrink: 0,
                    }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", lineHeight: 1.3 }}>{resource.name}</div>
                        {resource.type && (
                            <div style={{
                                display: "inline-block", marginTop: 4,
                                background: "#ede9fe", color: "#5b21b6",
                                borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                            }}>
                                {typeLabel[resource.type] || resource.type}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", padding: 0, flexShrink: 0 }}
                    >✕</button>
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Description */}
                    {resource.description && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                📖 NỘI DUNG DẠY GÌ
                            </div>
                            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>
                                {resource.description}
                            </p>
                        </div>
                    )}

                    {/* Skills gained */}
                    {resource.skills && resource.skills.length > 0 && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                🎯 KỸ NĂNG ĐẠT ĐƯỢC
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {resource.skills.map((s, i) => (
                                    <span key={i} style={{
                                        background: "#ecfdf5", color: "#065f46",
                                        border: "1px solid #a7f3d0",
                                        borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 500,
                                    }}>
                                        ✓ {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Link */}
                    {resource.url && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                🔗 TÌM Ở ĐÂU
                            </div>
                            <a
                                href={resource.url.startsWith("http") ? resource.url : `https://www.google.com/search?q=${encodeURIComponent(resource.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    background: "#4F46E5", color: "#fff", borderRadius: 8,
                                    padding: "8px 14px", fontSize: 13, fontWeight: 600,
                                    textDecoration: "none",
                                }}
                            >
                                🚀 Truy cập ngay
                            </a>
                        </div>
                    )}

                    {/* No description fallback */}
                    {!resource.description && !resource.skills?.length && (
                        <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>
                            Tài liệu do AI gợi ý dựa trên lộ trình của bạn.<br />
                            Tìm kiếm trên Google hoặc YouTube để bắt đầu.
                        </div>
                    )}

                    {/* Google search fallback button */}
                    {!resource.url && (
                        <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(resource.name + " học tiếng Anh")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                background: "#f1f5f9", color: "#475569", borderRadius: 8,
                                padding: "8px 14px", fontSize: 13, fontWeight: 600,
                                textDecoration: "none", border: "1px solid #e2e8f0",
                            }}
                        >
                            🔍 Tìm kiếm "{resource.name}"
                        </a>
                    )}
                </div>
            </div>
        </>
    );
}

// ===== Milestone Card =====
function MilestoneCard({
    ms, idx, total, onResourceClick,
}: {
    ms: Milestone; idx: number; total: number;
    onResourceClick: (r: Resource) => void;
}) {
    const [expanded, setExpanded] = useState(idx === 0);
    const st = STATUS[ms.status] || STATUS.pending;
    const isLast = idx === total - 1;
    const resources = (ms.resources || []).map(normalizeResource);

    return (
        <div style={{ display: "flex", gap: 12, marginBottom: isLast ? 0 : 8 }}>
            {/* Spine */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 24 }}>
                <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `3px solid ${st.color}`,
                    background: ms.status === "completed" ? st.color : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, flexShrink: 0, color: ms.status === "completed" ? "#fff" : st.color,
                    fontWeight: 700,
                }}>
                    {ms.status === "completed" ? "✓" : ms.status === "in_progress" ? "▶" : idx + 1}
                </div>
                {!isLast && <div style={{ width: 2, flex: 1, minHeight: 24, background: "#e2e8f0", marginTop: 4 }} />}
            </div>

            {/* Card */}
            <div style={{
                flex: 1, background: "#fff", borderRadius: 10,
                border: `1.5px solid ${expanded ? st.color + "55" : "#e2e8f0"}`,
                overflow: "hidden", marginBottom: isLast ? 24 : 0,
                transition: "border-color 0.2s",
            }}>
                {/* Header - always visible, click to toggle */}
                <button
                    onClick={() => setExpanded(e => !e)}
                    style={{ width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                    <div style={{ background: st.color + "18", color: st.color, borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        Tháng {ms.month}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", flex: 1 }}>{ms.title}</div>
                    {ms.progress_pct > 0 && (
                        <div style={{ fontSize: 12, color: st.color, fontWeight: 700, flexShrink: 0 }}>{ms.progress_pct}%</div>
                    )}
                    <div style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</div>
                </button>

                {/* Progress bar */}
                {ms.progress_pct > 0 && (
                    <div style={{ height: 3, background: "#f1f5f9", marginInline: 12 }}>
                        <div style={{ height: "100%", width: `${ms.progress_pct}%`, background: st.color, borderRadius: 2 }} />
                    </div>
                )}

                {/* Expanded body */}
                {expanded && (
                    <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #f1f5f9" }}>
                        {/* Target */}
                        {ms.target && (
                            <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>
                                🎯 <strong>Mục tiêu:</strong> {ms.target}
                            </div>
                        )}

                        {/* Topics */}
                        {ms.topics && ms.topics.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>📚 CHỦ ĐỀ HỌC</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {ms.topics.map((t, i) => (
                                        <span key={i} style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Activities */}
                        {ms.activities && ms.activities.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>🏃 HOẠT ĐỘNG</div>
                                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                                    {ms.activities.map((a, i) => <li key={i} style={{ fontSize: 12, color: "#475569" }}>{a}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Resources - clickable cards */}
                        {resources.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>🔗 TÀI LIỆU GỢI Ý — bấm để xem chi tiết</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {resources.map((r, i) => {
                                        const icon = TYPE_ICON[r.type || ""] || "📄";
                                        return (
                                            <button
                                                key={i}
                                                onClick={(e) => { e.stopPropagation(); onResourceClick(r); }}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 10,
                                                    background: "#f8fafc", borderRadius: 8,
                                                    border: "1.5px solid #e2e8f0", padding: "8px 10px",
                                                    cursor: "pointer", textAlign: "left", width: "100%",
                                                    transition: "border-color 0.15s, background 0.15s",
                                                }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#a78bfa"; (e.currentTarget as HTMLButtonElement).style.background = "#faf5ff"; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
                                            >
                                                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {r.name}
                                                    </div>
                                                    {r.description && (
                                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {r.description}
                                                        </div>
                                                    )}
                                                    {r.skills && r.skills.length > 0 && (
                                                        <div style={{ fontSize: 10, color: "#10b981", marginTop: 2 }}>
                                                            ✓ {r.skills.slice(0, 2).join(" · ")}{r.skills.length > 2 ? ` +${r.skills.length - 2}` : ""}
                                                        </div>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 14, color: "#94a3b8", flexShrink: 0 }}>›</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        <div style={{ marginTop: 10 }}>
                            <span style={{ fontSize: 11, color: st.color, background: st.color + "15", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                                {st.label}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ===== Main =====
export default function RoadmapDiagram({ milestones, goalTitle }: Props) {
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const sorted = [...milestones].sort((a, b) => a.month - b.month);
    const done = milestones.filter(m => m.status === "completed").length;
    const totalPct = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0;

    if (milestones.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#475569" }}>Chưa có lộ trình</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Chat với AI để tạo lộ trình cá nhân hóa!</div>
            </div>
        );
    }

    return (
        <>
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
                    <MilestoneCard
                        key={ms.milestone_id || idx}
                        ms={ms}
                        idx={idx}
                        total={sorted.length}
                        onResourceClick={setSelectedResource}
                    />
                ))}

                {/* Finish node */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
                        <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: totalPct === 100 ? "#10b981" : "#e2e8f0",
                            border: `3px solid ${totalPct === 100 ? "#10b981" : "#cbd5e0"}`,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
                            color: totalPct === 100 ? "#fff" : "#94a3b8",
                        }}>
                            🏁
                        </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                        {totalPct === 100 ? "🎉 Hoàn thành mục tiêu!" : "🏁 Đích đến"}
                    </div>
                </div>
            </div>

            {/* Resource detail slide-in panel */}
            {selectedResource && (
                <ResourcePanel resource={selectedResource} onClose={() => setSelectedResource(null)} />
            )}
        </>
    );
}
