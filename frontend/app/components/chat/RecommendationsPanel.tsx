"use client";

/**
 * RecommendationsPanel – Phase 3 Course Recommendations
 * AI-powered course suggestions based on user profile & goals
 */

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Recommendation {
    id: string;
    title: string;
    reason: string;
    match: number;
}

interface Props {
    userId?: string;
    onClose: () => void;
    onStartChat?: (message: string) => void;
}

export default function RecommendationsPanel({ userId = "default", onClose, onStartChat }: Props) {
    const [recs, setRecs] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecs();
    }, [userId]);

    const fetchRecs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/recommendations?user_id=${userId}`);
            const data = await res.json();
            setRecs(data.recommendations || []);
        } catch {
            // Use default recommendations if API fails
            setRecs([
                { id: "toeic-basics", title: "TOEIC Listening & Reading Basics", reason: "Phù hợp với mục tiêu của bạn", match: 90 },
                { id: "english-grammar", title: "Essential English Grammar A2-B2", reason: "Củng cố nền tảng ngữ pháp", match: 80 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getMatchColor = (match: number) => {
        if (match >= 85) return "#10b981";
        if (match >= 70) return "#f59e0b";
        return "#6b7280";
    };

    return (
        <div className="rec-panel">
            <div className="rec-panel__header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Khóa học gợi ý</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Dựa trên hồ sơ & mục tiêu của bạn</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    <button
                        className="rec-panel__refresh"
                        onClick={fetchRecs}
                        title="Làm mới"
                    >
                        🔄
                    </button>
                    <button className="rec-panel__close" onClick={onClose}>✕</button>
                </div>
            </div>

            <div className="rec-panel__body">
                {loading ? (
                    <div className="rec-loading">
                        <div className="rec-loading__spinner" />
                        <span>AI đang phân tích hồ sơ của bạn...</span>
                    </div>
                ) : recs.length === 0 ? (
                    <div className="rec-empty">
                        <div style={{ fontSize: 40, marginBottom: 8 }}>📚</div>
                        <div>Chưa có đủ dữ liệu để gợi ý.</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                            Hãy cài đặt mục tiêu học tập để nhận gợi ý phù hợp.
                        </div>
                    </div>
                ) : (
                    <div className="rec-list">
                        {recs.map((rec, i) => (
                            <div key={rec.id || i} className="rec-card">
                                <div className="rec-card__header">
                                    <div className="rec-card__rank">#{i + 1}</div>
                                    <div
                                        className="rec-card__match"
                                        style={{ color: getMatchColor(rec.match), borderColor: getMatchColor(rec.match) }}
                                    >
                                        {rec.match}% phù hợp
                                    </div>
                                </div>
                                <div className="rec-card__title">{rec.title}</div>
                                <div className="rec-card__reason">💬 {rec.reason}</div>
                                {onStartChat && (
                                    <button
                                        className="rec-card__btn"
                                        onClick={() => onStartChat(`Tôi muốn tìm hiểu về khóa học "${rec.title}". Hãy cho tôi biết nội dung và lợi ích của khóa học này.`)}
                                    >
                                        Hỏi về khóa học này →
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
