"use client";

/**
 * Learnify Tutor AI – Màn hồ sơ học viên
 * Thông tin cá nhân: tên, trình độ, kỹ năng, phong cách học, thời gian học.
 * (Mục tiêu & lộ trình được quản lý riêng ở màn Mục tiêu & Lộ trình)
 */

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";



const LEVEL_OPTIONS = ["Beginner", "Elementary", "Intermediate", "Upper-Intermediate", "Advanced"];

const STYLE_OPTIONS = [
    { value: "visual", label: "👁️ Trực quan (hình ảnh, sơ đồ)" },
    { value: "auditory", label: "👂 Nghe (podcast, bài giảng)" },
    { value: "reading", label: "📖 Đọc (tài liệu, sách)" },
    { value: "kinesthetic", label: "✋ Thực hành (bài tập, quiz)" },
];

interface Props {
    onBack: () => void;
    userId?: string;
}

export default function ProfileScreen({ onBack, userId = "default" }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [name, setName] = useState("");
    const [level, setLevel] = useState("Beginner");
    const [dailyHours, setDailyHours] = useState(2);
    const [learningStyle, setLearningStyle] = useState("");
    const [customStyle, setCustomStyle] = useState("");
    const [notes, setNotes] = useState("");

    // Load profile
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/profile/${userId}`);
                const data = await res.json();
                const p = data.profile;
                if (p) {
                    setName(p.name || "");
                    setLevel(p.level || "Beginner");
                    setDailyHours(p.daily_hours || 2);
                    const style = p.learning_style || "";
                    const isPreset = ["visual","auditory","reading","kinesthetic"].includes(style);
                    setLearningStyle(isPreset ? style : (style ? "other" : ""));
                    setCustomStyle(isPreset ? "" : style);
                    setNotes(p.notes || "");
                }
            } catch (err) {
                console.error("Lỗi load profile:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [userId]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await fetch(`${API_URL}/api/profile/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    level,
                    daily_hours: dailyHours,
                    learning_style: learningStyle === "other" ? customStyle : learningStyle,
                    notes,
                }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error("Lỗi lưu profile:", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="screen-container">
                <div className="screen-loading">Đang tải hồ sơ...</div>
            </div>
        );
    }

    return (
        <div className="screen-container">
            {/* Header */}
            <div className="screen-header">
                <button className="screen-back" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Quay lại
                </button>
                <h2 className="screen-title">👤 Hồ sơ học viên</h2>
                <button
                    className={`screen-save ${saving ? "screen-save--saving" : ""} ${saved ? "screen-save--saved" : ""}`}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Đang lưu..." : saved ? "✓ Đã lưu" : "Lưu"}
                </button>
            </div>

            {/* Form */}
            <div className="screen-body">
                <div className="screen-form">
                    {/* Tên */}
                    <div className="form-group">
                        <label className="form-label">Tên của bạn</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="VD: Nguyễn Văn A"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    {/* Trình độ */}
                    <div className="form-group">
                        <label className="form-label">Trình độ hiện tại</label>
                        <div className="form-chips">
                            {LEVEL_OPTIONS.map(lv => (
                                <button
                                    key={lv}
                                    className={`form-chip ${level === lv ? "form-chip--active" : ""}`}
                                    onClick={() => setLevel(lv)}
                                >
                                    {lv}
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Daily hours */}
                    <div className="form-group">
                        <label className="form-label">Thời gian học/ngày: {dailyHours}h</label>
                        <input className="form-slider" type="range" min="0.5" max="20" step="0.5"
                            value={dailyHours} onChange={e => setDailyHours(parseFloat(e.target.value))} />
                    </div>



                    {/* Phong cách học */}
                    <div className="form-group">
                        <label className="form-label">Phong cách học</label>
                        <div className="form-chips">
                            {STYLE_OPTIONS.map(st => (
                                <button
                                    key={st.value}
                                    className={`form-chip ${learningStyle === st.value ? "form-chip--active" : ""}`}
                                    onClick={() => setLearningStyle(st.value)}
                                >
                                    {st.label}
                                </button>
                            ))}
                            <button
                                className={`form-chip ${learningStyle === "other" ? "form-chip--active" : ""}`}
                                onClick={() => setLearningStyle("other")}
                            >
                                ✏️ Khác
                            </button>
                        </div>
                        {learningStyle === "other" && (
                            <input
                                className="form-input"
                                style={{ marginTop: 8 }}
                                type="text"
                                placeholder="VD: Học qua video, học nhóm, flashcard..."
                                value={customStyle}
                                onChange={e => setCustomStyle(e.target.value)}
                            />
                        )}
                    </div>

                    {/* Ghi chú */}
                    <div className="form-group">
                        <label className="form-label">Ghi chú thêm</label>
                        <textarea
                            className="form-textarea"
                            rows={3}
                            placeholder="VD: Cần cải thiện Task 2 Writing, thường quên từ vựng..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
