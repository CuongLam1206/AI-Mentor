"use client";

/**
 * RoadmapDiagram v6 — Resource view, toggle completion, replace with custom.
 * - Click resource card → detail panel (description, skills, link)
 * - Panel has "Thay thế" section: type new resource name → AI fetches info → confirm
 */

import { useState, useCallback, useEffect } from "react";

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

const TYPE_LABEL: Record<string, string> = {
    book: "Sách", website: "Website", video: "Video", app: "Ứng dụng", course: "Khóa học", tool: "Công cụ",
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
function ResourcePanel({ resource, milestoneTitle, onClose, onToggleComplete, onReplace }: {
    resource: Resource;
    milestoneTitle: string;
    onClose: () => void;
    onToggleComplete: () => void;
    onReplace: (newResource: Resource) => void;
}) {
    const icon = TYPE_ICON[resource.type || ""] || "📄";
    const [replaceMode, setReplaceMode] = useState(false);
    const [replaceName, setReplaceName] = useState("");
    const [replaceLoading, setReplaceLoading] = useState(false);
    const [replacePreview, setReplacePreview] = useState<Resource | null>(null);

    const fetchResourceInfo = async () => {
        if (!replaceName.trim()) return;
        setReplaceLoading(true);
        setReplacePreview(null);
        try {
            const res = await fetch(`${API_URL}/api/resource-info`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resource_name: replaceName.trim(), milestone_topic: milestoneTitle }),
            });
            const data = await res.json();
            if (data.resource) setReplacePreview(data.resource);
        } catch { setReplacePreview({ name: replaceName, description: "Không lấy được mô tả.", skills: [] }); }
        finally { setReplaceLoading(false); }
    };

    return (
        <>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100 }} onClick={onClose} />
            <div style={{
                position: "fixed", right: 0, top: 0, bottom: 0, width: 340, maxWidth: "95vw",
                background: "#fff", zIndex: 101, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
                display: "flex", flexDirection: "column", overflowY: "auto",
            }}>
                {/* Header */}
                <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "flex-start", background: resource.completed ? "#f0fdf4" : "#fff" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", lineHeight: 1.3 }}>{resource.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                            {resource.type && (
                                <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                                    {TYPE_LABEL[resource.type] || resource.type}
                                </span>
                            )}
                            {resource.completed && (
                                <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                                    ✅ Đã học xong
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", flexShrink: 0 }}>✕</button>
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Description */}
                    {resource.description ? (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>📖 NỘI DUNG DẠY GÌ</div>
                            <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0, background: "#f8fafc", borderRadius: 8, padding: 10 }}>{resource.description}</p>
                        </div>
                    ) : (
                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10, fontSize: 12, color: "#92400e" }}>
                            💡 Tài liệu này chưa có mô tả. Dùng nút "Thay thế" bên dưới để tìm kiếm thông tin hoặc tự nhập tài liệu khác.
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

                    {/* Completion button */}
                    <button
                        onClick={() => { onToggleComplete(); onClose(); }}
                        style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            background: resource.completed ? "#f0fdf4" : "#4F46E5",
                            color: resource.completed ? "#065f46" : "#fff",
                            border: resource.completed ? "2px solid #86efac" : "none",
                            borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%",
                        }}
                    >
                        {resource.completed ? "↩ Bỏ đánh dấu hoàn thành" : "🎓 Đánh dấu đã học xong"}
                    </button>

                    {/* Access link */}
                    {resource.url ? (
                        <a href={resource.url.startsWith("http") ? resource.url : `https://www.google.com/search?q=${encodeURIComponent(resource.name)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                            🔗 Truy cập tài liệu
                        </a>
                    ) : (
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(resource.name)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                            🔍 Tìm kiếm "{resource.name}"
                        </a>
                    )}

                    {/* Divider */}
                    <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 12 }}>
                        {!replaceMode ? (
                            <button onClick={() => setReplaceMode(true)} style={{ background: "none", border: "1px dashed #cbd5e0", cursor: "pointer", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#64748b", width: "100%", fontWeight: 600 }}>
                                🔄 Muốn dùng tài liệu khác?
                            </button>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>🔄 THAY THẾ BẰNG TÀI LIỆU KHÁC</div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <input
                                        style={{ flex: 1, border: "1.5px solid #a78bfa", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none" }}
                                        placeholder="VD: Coursera Python, Real Python..."
                                        value={replaceName}
                                        onChange={e => { setReplaceName(e.target.value); setReplacePreview(null); }}
                                        onKeyDown={e => e.key === "Enter" && fetchResourceInfo()}
                                    />
                                    <button
                                        onClick={fetchResourceInfo} disabled={!replaceName.trim() || replaceLoading}
                                        style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                                    >
                                        {replaceLoading ? "..." : "Tìm"}
                                    </button>
                                </div>

                                {/* Preview */}
                                {replacePreview && (
                                    <div style={{ background: "#f8fafc", border: "1.5px solid #a78bfa", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <span style={{ fontSize: 16 }}>{TYPE_ICON[replacePreview.type || ""] || "📄"}</span>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{replacePreview.name}</div>
                                                {replacePreview.type && <span style={{ fontSize: 10, background: "#ede9fe", color: "#5b21b6", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{TYPE_LABEL[replacePreview.type] || replacePreview.type}</span>}
                                            </div>
                                        </div>
                                        {replacePreview.description && <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: 0 }}>{replacePreview.description}</p>}
                                        {replacePreview.skills && replacePreview.skills.length > 0 && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                {replacePreview.skills.map((s, i) => (
                                                    <span key={i} style={{ background: "#ecfdf5", color: "#065f46", borderRadius: 12, padding: "2px 8px", fontSize: 11, border: "1px solid #a7f3d0" }}>✓ {s}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                            <button
                                                onClick={() => { onReplace({ ...replacePreview, completed: false }); onClose(); }}
                                                style={{ flex: 1, background: "#4F46E5", color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                            >
                                                ✓ Dùng tài liệu này
                                            </button>
                                            <button onClick={() => { setReplacePreview(null); setReplaceName(""); }} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>
                                                Huỷ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ===== Milestone Card =====
function MilestoneCard({ ms, idx, total, onResourceClick }: {
    ms: Milestone; idx: number; total: number;
    onResourceClick: (r: Resource, msIdx: number, rIdx: number, action?: "toggle") => void;
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
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `3px solid ${st.color}`, background: ms.status === "completed" ? st.color : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0, color: ms.status === "completed" ? "#fff" : st.color, fontWeight: 700 }}>
                    {ms.status === "completed" ? "✓" : ms.status === "in_progress" ? "▶" : idx + 1}
                </div>
                {!isLast && <div style={{ width: 2, flex: 1, minHeight: 24, background: "#e2e8f0", marginTop: 4 }} />}
            </div>

            {/* Card */}
            <div style={{ flex: 1, background: "#fff", borderRadius: 10, marginBottom: isLast ? 24 : 0, border: `1.5px solid ${expanded ? st.color + "55" : "#e2e8f0"}`, overflow: "hidden" }}>
                {/* Header */}
                <button onClick={() => setExpanded(e => !e)} style={{ width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ background: st.color + "18", color: st.color, borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Tháng {ms.month}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", flex: 1 }}>{ms.title}</div>
                    {resources.length > 0 && (
                        <div style={{ fontSize: 10, color: doneCount === resources.length && resources.length > 0 ? "#10b981" : "#94a3b8", flexShrink: 0, fontWeight: 600 }}>
                            {doneCount}/{resources.length} tài liệu
                        </div>
                    )}
                    {ms.progress_pct > 0 && <div style={{ fontSize: 12, color: st.color, fontWeight: 700, flexShrink: 0 }}>{ms.progress_pct}%</div>}
                    <div style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</div>
                </button>

                {ms.progress_pct > 0 && (
                    <div style={{ height: 3, background: "#f1f5f9", marginInline: 12 }}>
                        <div style={{ height: "100%", width: `${ms.progress_pct}%`, background: st.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                    </div>
                )}

                {expanded && (
                    <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #f1f5f9" }}>
                        {ms.target && <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>🎯 <strong>Mục tiêu:</strong> {ms.target}</div>}

                        {ms.topics && ms.topics.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>📚 CHỦ ĐỀ HỌC</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {ms.topics.map((t, i) => <span key={i} style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{t}</span>)}
                                </div>
                            </div>
                        )}

                        {ms.activities && ms.activities.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>🏃 HOẠT ĐỘNG</div>
                                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                                    {ms.activities.map((a, i) => <li key={i} style={{ fontSize: 12, color: "#475569" }}>{a}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Resources */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
                                🔗 TÀI LIỆU AI GỢI Ý
                                {resources.length > 0 && <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6 }}>— bấm ✓ đánh dấu, bấm tên để xem & thay thế</span>}
                            </div>

                            {resources.length === 0 ? (
                                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                                    Chưa có tài liệu. Chat với AI để tạo lộ trình mới hoặc thêm trong tab Chỉnh sửa.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {resources.map((r, rIdx) => {
                                        const ricon = TYPE_ICON[r.type || ""] || "📄";
                                        return (
                                            <div key={rIdx} style={{ display: "flex", alignItems: "center", gap: 8, background: r.completed ? "#f0fdf4" : "#f8fafc", borderRadius: 8, border: `1.5px solid ${r.completed ? "#86efac" : "#e2e8f0"}`, padding: "7px 10px", transition: "all 0.2s" }}>
                                                {/* Toggle */}
                                                <button onClick={e => { e.stopPropagation(); onResourceClick(r, idx, rIdx, "toggle"); }}
                                                    title={r.completed ? "Bỏ đánh dấu" : "Đánh dấu đã học"}
                                                    style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, border: `2px solid ${r.completed ? "#10b981" : "#cbd5e0"}`, background: r.completed ? "#10b981" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700 }}>
                                                    {r.completed ? "✓" : ""}
                                                </button>
                                                <span style={{ fontSize: 18, flexShrink: 0 }}>{ricon}</span>
                                                {/* Name → open panel */}
                                                <button onClick={e => { e.stopPropagation(); onResourceClick(r, idx, rIdx); }}
                                                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12, color: r.completed ? "#16a34a" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: r.completed ? "line-through" : "none" }}>
                                                        {r.name}
                                                    </div>
                                                    {r.description ? (
                                                        <div style={{ fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{r.description}</div>
                                                    ) : r.skills && r.skills.length > 0 ? (
                                                        <div style={{ fontSize: 10, color: "#10b981", marginTop: 1 }}>✓ {r.skills.slice(0, 2).join(" · ")}</div>
                                                    ) : null}
                                                </button>
                                                <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>›</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div style={{ marginTop: 10 }}>
                            <span style={{ fontSize: 11, color: st.color, background: st.color + "15", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{st.label}</span>
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
    const [enriching, setEnriching] = useState(false);

    // Sync when parent gives new milestones (e.g. after AI generation)
    useEffect(() => { setMilestones(initialMilestones); }, [initialMilestones]);

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
        } catch { /* silent */ } finally { setSaving(false); }
    }, [goalId]);

    const updateMilestones = useCallback((updated: Milestone[]) => {
        setMilestones(updated);
        saveToAPI(updated);
        onMilestonesUpdate?.(updated);
    }, [saveToAPI, onMilestonesUpdate]);

    const enrichResources = useCallback(async () => {
        if (!goalId || enriching) return;
        setEnriching(true);
        setSavedMsg("⏳ Đang gọi AI...");
        try {
            const res = await fetch(`${API_URL}/api/goals/${goalId}/enrich-resources`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId }),
            });
            const data = await res.json();
            console.log("🔮 Enrich response:", data);
            if (data.error) {
                setSavedMsg(`⚠️ ${data.error}`);
            } else if (data.milestones) {
                setMilestones(data.milestones);
                onMilestonesUpdate?.(data.milestones);
                if ((data.enriched ?? 0) > 0) {
                    setSavedMsg(`✓ Đã gợi ý ${data.enriched} milestone`);
                } else {
                    setSavedMsg("⚠️ Không cần cập nhật (đã có tài liệu)");
                }
            }
            setTimeout(() => setSavedMsg(""), 4000);
        } catch (e) {
            console.error("Enrich error:", e);
            setSavedMsg("❌ Lỗi kết nối API");
            setTimeout(() => setSavedMsg(""), 3000);
        } finally { setEnriching(false); }
    }, [goalId, userId, enriching, onMilestonesUpdate]);


    const handleResourceClick = useCallback((r: Resource, msIdx: number, rIdx: number, action?: "toggle") => {
        if (action === "toggle") {
            setMilestones(prev => {
                const updated = prev.map((ms, mi) => {
                    if (mi !== msIdx) return ms;
                    const resources = (ms.resources || []).map((res, ri) => {
                        const norm = normalizeResource(res);
                        return ri === rIdx ? { ...norm, completed: !norm.completed } : norm;
                    });
                    const { status, progress_pct } = calcMilestoneStatus(resources, ms.status);
                    return { ...ms, resources, status, progress_pct };
                });
                saveToAPI(updated);
                onMilestonesUpdate?.(updated);
                return updated;
            });
        } else {
            setSelectedResource({ r, msIdx, rIdx });
        }
    }, [saveToAPI, onMilestonesUpdate]);

    const handleReplace = useCallback((msIdx: number, rIdx: number, newResource: Resource) => {
        setMilestones(prev => {
            const updated = prev.map((ms, mi) => {
                if (mi !== msIdx) return ms;
                const resources = (ms.resources || []).map((res, ri) => ri === rIdx ? newResource : normalizeResource(res));
                return { ...ms, resources };
            });
            saveToAPI(updated);
            onMilestonesUpdate?.(updated);
            return updated;
        });
    }, [saveToAPI, onMilestonesUpdate]);

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
                <div style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7c3aed 100%)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>🎯</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{goalTitle}</div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{done}/{milestones.length} milestones · {totalPct}% hoàn thành</div>
                    </div>
                    {/* Enrich button — show when any milestone has empty resources */}
                    {milestones.some(m => !(m.resources?.length) || (m.resources as (Resource|string)[]).every(r => typeof r === "string")) && goalId && (
                        <button
                            onClick={enrichResources}
                            disabled={enriching}
                            style={{ background: enriching ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.22)", border: "1.5px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: enriching ? "default" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}
                        >
                            {enriching ? "⏳ Đang tìm..." : "🔮 AI gợi ý tài liệu"}
                        </button>
                    )}
                    {(saving || savedMsg) && <div style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>{saving ? "Đang lưu..." : savedMsg}</div>}
                </div>

                {sorted.map((ms, idx) => (
                    <MilestoneCard key={ms.milestone_id || idx} ms={ms} idx={idx} total={sorted.length} onResourceClick={handleResourceClick} />
                ))}

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: totalPct === 100 ? "#10b981" : "#e2e8f0", border: `3px solid ${totalPct === 100 ? "#10b981" : "#cbd5e0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🏁</div>
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>{totalPct === 100 ? "🎉 Hoàn thành mục tiêu!" : "🏁 Đích đến"}</div>
                </div>
            </div>

            {selectedResource && (
                <ResourcePanel
                    resource={selectedResource.r}
                    milestoneTitle={milestones[selectedResource.msIdx]?.title || ""}
                    onClose={() => setSelectedResource(null)}
                    onToggleComplete={() => handleResourceClick(selectedResource.r, selectedResource.msIdx, selectedResource.rIdx, "toggle")}
                    onReplace={(newRes) => handleReplace(selectedResource.msIdx, selectedResource.rIdx, newRes)}
                />
            )}
        </>
    );
}
