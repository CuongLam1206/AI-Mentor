"use client";

/**
 * RoadmapDiagram v5 — Resource completion tracking.
 * Mỗi resource có toggle "Đã học xong". Auto-save lên API khi toggle.
 * Milestone progress_pct tự động tính từ resource completion.
 */

import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-mentor-iwkf.onrender.com";

// ===== Types =====
interface Resource {
    name: string;
    type?: string;
    url?: string;
    description?: string;
    skills?: string[];
    completed?: boolean;
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
    goalId?: string;
    userId?: string;
    onMilestonesUpdate?: (updated: Milestone[]) => void;
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

function calcMilestoneStatus(resources: Resource[], oldStatus: string): { status: string; progress_pct: number } {
    if (resources.length === 0) return { status: oldStatus, progress_pct: 0 };
    const done = resources.filter(r => r.completed).length;
    const pct = Math.round((done / resources.length) * 100);
    const status = done === resources.length ? "completed" : done > 0 ? "in_progress" : "pending";
    return { status, progress_pct: pct };
}

// ===== Resource Detail Panel =====
function ResourcePanel({ resource, onClose, onToggleComplete }: {
    resource: Resource;
    onClose: () => void;
    onToggleComplete: () => void;
}) {
    const icon = TYPE_ICON[resource.type || ""] || "📄";
    const typeLabel: Record<string, string> = {
        book: "Sách", website: "Website", video: "Video", app: "Ứng dụng", course: "Khóa học", tool: "Công cụ",
    };
    return (
        <>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100 }} onClick={onClose} />
            <div style={{
                position: "fixed", right: 0, top: 0, bottom: 0, width: 320, maxWidth: "92vw",
                background: "#fff", zIndex: 101, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
                display: "flex", flexDirection: "column", overflowY: "auto",
            }}>
                {/* Header */}
                <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", lineHeight: 1.3 }}>{resource.name}</div>
                        {resource.type && (
                            <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, marginTop: 4, display: "inline-block" }}>
                                {typeLabel[resource.type] || resource.type}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", padding: 0, flexShrink: 0 }}>✕</button>
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                    {/* Description */}
                    {resource.description && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>📖 NỘI DUNG DẠY GÌ</div>
                            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{resource.description}</p>
                        </div>
                    )}

                    {/* Skills */}
                    {resource.skills && resource.skills.length > 0 && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>🎯 KỸ NĂNG ĐẠT ĐƯỢC</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {resource.skills.map((s, i) => (
                                    <span key={i} style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>
                                        ✓ {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completion toggle — primary action */}
                    <button
                        onClick={() => { onToggleComplete(); onClose(); }}
                        style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            background: resource.completed ? "#ecfdf5" : "#4F46E5",
                            color: resource.completed ? "#065f46" : "#fff",
                            border: resource.completed ? "2px solid #a7f3d0" : "none",
                            borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700,
                            cursor: "pointer", width: "100%",
                        }}
                    >
                        {resource.completed ? "✅ Đã học xong — Bỏ đánh dấu?" : "🎓 Đánh dấu đã học xong"}
                    </button>

                    {/* Link */}
                    {resource.url ? (
                        <a
                            href={resource.url.startsWith("http") ? resource.url : `https://www.google.com/search?q=${encodeURIComponent(resource.name)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                        >
                            🔗 Truy cập tài liệu
                        </a>
                    ) : (
                        <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(resource.name)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                        >
                            🔍 Tìm kiếm "{resource.name}"
                        </a>
                    )}

                    {/* Fallback */}
                    {!resource.description && !resource.skills?.length && (
                        <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>Tài liệu do AI gợi ý. Tìm trên Google để bắt đầu học!</div>
                    )}
                </div>
            </div>
        </>
    );
}

// ===== Milestone Card =====
function MilestoneCard({ ms, idx, total, onResourceClick }: {
    ms: Milestone; idx: number; total: number;
    onResourceClick: (r: Resource, msIdx: number, rIdx: number) => void;
}) {
    const [expanded, setExpanded] = useState(idx === 0);
    const st = STATUS[ms.status] || STATUS.pending;
    const isLast = idx === total - 1;
    const resources = (ms.resources || []).map(normalizeResource);
    const doneCount = resources.filter(r => r.completed).length;

    return (
        <div style={{ display: "flex", gap: 12, marginBottom: isLast ? 0 : 8 }}>
            {/* Spine */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 24 }}>
                <div style={{
                    width: 20, height: 20, borderRadius: "50%", border: `3px solid ${st.color}`,
                    background: ms.status === "completed" ? st.color : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, flexShrink: 0, color: ms.status === "completed" ? "#fff" : st.color, fontWeight: 700,
                }}>
                    {ms.status === "completed" ? "✓" : ms.status === "in_progress" ? "▶" : idx + 1}
                </div>
                {!isLast && <div style={{ width: 2, flex: 1, minHeight: 24, background: "#e2e8f0", marginTop: 4 }} />}
            </div>

            {/* Card */}
            <div style={{
                flex: 1, background: "#fff", borderRadius: 10, marginBottom: isLast ? 24 : 0,
                border: `1.5px solid ${expanded ? st.color + "55" : "#e2e8f0"}`, overflow: "hidden",
            }}>
                {/* Header */}
                <button
                    onClick={() => setExpanded(e => !e)}
                    style={{ width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                    <div style={{ background: st.color + "18", color: st.color, borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        Tháng {ms.month}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", flex: 1 }}>{ms.title}</div>
                    {resources.length > 0 && (
                        <div style={{ fontSize: 10, color: doneCount === resources.length && resources.length > 0 ? "#10b981" : "#94a3b8", flexShrink: 0, fontWeight: 600 }}>
                            {doneCount}/{resources.length} tài liệu
                        </div>
                    )}
                    {ms.progress_pct > 0 && (
                        <div style={{ fontSize: 12, color: st.color, fontWeight: 700, flexShrink: 0 }}>{ms.progress_pct}%</div>
                    )}
                    <div style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</div>
                </button>

                {/* Progress bar */}
                {ms.progress_pct > 0 && (
                    <div style={{ height: 3, background: "#f1f5f9", marginInline: 12 }}>
                        <div style={{ height: "100%", width: `${ms.progress_pct}%`, background: st.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                    </div>
                )}

                {/* Body */}
                {expanded && (
                    <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #f1f5f9" }}>
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

                        {/* Resources with completion toggle */}
                        {resources.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
                                    🔗 TÀI LIỆU GỢI Ý
                                    <span style={{ fontWeight: 400, marginLeft: 6, color: "#94a3b8" }}>— bấm ✓ để đánh dấu đã học, bấm tên để xem chi tiết</span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {resources.map((r, rIdx) => {
                                        const icon = TYPE_ICON[r.type || ""] || "📄";
                                        return (
                                            <div
                                                key={rIdx}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 8,
                                                    background: r.completed ? "#f0fdf4" : "#f8fafc",
                                                    borderRadius: 8,
                                                    border: `1.5px solid ${r.completed ? "#86efac" : "#e2e8f0"}`,
                                                    padding: "7px 10px",
                                                    transition: "all 0.2s",
                                                }}
                                            >
                                                {/* Completion toggle */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onResourceClick({...r, _action: "toggle"} as Resource & {_action: string}, idx, rIdx); }}
                                                    title={r.completed ? "Bỏ đánh dấu" : "Đánh dấu đã học xong"}
                                                    style={{
                                                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                                        border: `2px solid ${r.completed ? "#10b981" : "#cbd5e0"}`,
                                                        background: r.completed ? "#10b981" : "transparent",
                                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: 11, color: "#fff", fontWeight: 700, transition: "all 0.2s",
                                                    }}
                                                >
                                                    {r.completed ? "✓" : ""}
                                                </button>

                                                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>

                                                {/* Name — click for detail */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onResourceClick(r, idx, rIdx); }}
                                                    style={{
                                                        flex: 1, minWidth: 0, background: "none", border: "none",
                                                        cursor: "pointer", textAlign: "left", padding: 0,
                                                    }}
                                                >
                                                    <div style={{
                                                        fontWeight: 600, fontSize: 12, color: r.completed ? "#16a34a" : "#1e293b",
                                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                        textDecoration: r.completed ? "line-through" : "none",
                                                    }}>
                                                        {r.name}
                                                    </div>
                                                    {r.skills && r.skills.length > 0 && (
                                                        <div style={{ fontSize: 10, color: "#10b981", marginTop: 1 }}>
                                                            ✓ {r.skills.slice(0, 2).join(" · ")}{r.skills.length > 2 ? ` +${r.skills.length - 2}` : ""}
                                                        </div>
                                                    )}
                                                </button>

                                                <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>›</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Status badge */}
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
export default function RoadmapDiagram({ milestones: initialMilestones, goalTitle, goalId, userId = "guest", onMilestonesUpdate }: Props) {
    const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
    const [selectedResource, setSelectedResource] = useState<{ r: Resource; msIdx: number; rIdx: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    // Sync external milestone changes (e.g. after AI generation)
    useState(() => { setMilestones(initialMilestones); });

    const saveToAPI = useCallback(async (updated: Milestone[]) => {
        if (!goalId) return;
        setSaving(true);
        try {
            await fetch(`${API_URL}/api/goals/${goalId}/milestones`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ milestones: updated }),
            });
            setSavedMsg("✓ Đã lưu");
            setTimeout(() => setSavedMsg(""), 2000);
        } catch { /* silent */ } finally {
            setSaving(false);
        }
    }, [goalId]);

    const toggleResourceComplete = useCallback((msIdx: number, rIdx: number) => {
        setMilestones(prev => {
            const updated = prev.map((ms, mi) => {
                if (mi !== msIdx) return ms;
                const resources = (ms.resources || []).map((r, ri) => {
                    const res = normalizeResource(r);
                    if (ri !== rIdx) return res;
                    return { ...res, completed: !res.completed };
                });
                const { status, progress_pct } = calcMilestoneStatus(resources, ms.status);
                return { ...ms, resources, status, progress_pct };
            });
            saveToAPI(updated);
            onMilestonesUpdate?.(updated);
            return updated;
        });
    }, [saveToAPI, onMilestonesUpdate]);

    const handleResourceClick = useCallback((r: Resource & { _action?: string }, msIdx: number, rIdx: number) => {
        if (r._action === "toggle") {
            toggleResourceComplete(msIdx, rIdx);
        } else {
            setSelectedResource({ r, msIdx, rIdx });
        }
    }, [toggleResourceComplete]);

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
                    {(saving || savedMsg) && (
                        <div style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 8px" }}>
                            {saving ? "Đang lưu..." : savedMsg}
                        </div>
                    )}
                </div>

                {sorted.map((ms, idx) => (
                    <MilestoneCard
                        key={ms.milestone_id || idx}
                        ms={ms}
                        idx={idx}
                        total={sorted.length}
                        onResourceClick={handleResourceClick}
                    />
                ))}

                {/* Finish */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
                        <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: totalPct === 100 ? "#10b981" : "#e2e8f0",
                            border: `3px solid ${totalPct === 100 ? "#10b981" : "#cbd5e0"}`,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                        }}>🏁</div>
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                        {totalPct === 100 ? "🎉 Hoàn thành mục tiêu!" : "🏁 Đích đến"}
                    </div>
                </div>
            </div>

            {/* Resource detail panel */}
            {selectedResource && (
                <ResourcePanel
                    resource={selectedResource.r}
                    onClose={() => setSelectedResource(null)}
                    onToggleComplete={() => {
                        toggleResourceComplete(selectedResource.msIdx, selectedResource.rIdx);
                        setSelectedResource(null);
                    }}
                />
            )}
        </>
    );
}
