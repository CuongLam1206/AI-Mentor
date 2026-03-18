"use client";

/**
 * Learnify Tutor AI – Lịch sử hội thoại v3.0 (Gemini Style)
 * - 3-dot menu per item: ⭐ Đánh sao, ✏️ Đổi tên, 🗑 Xoá
 * - Star/Unstar to mark favorites
 * - Starred items section at top (like Gemini "Nội dung của tôi")
 * - Clean Gemini-style list layout
 */

import { useState, useRef, useEffect } from "react";
import { HoiThoai } from "@/app/types/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
    danhSach: HoiThoai[];
    sessionHienTai: string;
    onChonHoiThoai: (sessionId: string) => void;
    onCapNhat?: () => void;
}

export default function ChatHistory({ danhSach, sessionHienTai, onChonHoiThoai, onCapNhat }: Props) {
    const [dangXoa, setDangXoa] = useState<string | null>(null);
    const [menuMo, setMenuMo] = useState<string | null>(null);
    const [dangDoiTen, setDangDoiTen] = useState<string | null>(null);
    const [tenMoi, setTenMoi] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const homNay = new Date().toDateString();
    const homQua = new Date(Date.now() - 86400000).toDateString();

    // Click outside to close menu
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuMo(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Focus rename input
    useEffect(() => {
        if (dangDoiTen && inputRef.current) inputRef.current.focus();
    }, [dangDoiTen]);

    // Group conversations
    const starred = danhSach.filter((ht) => ht.starred);
    const unstarred = danhSach.filter((ht) => !ht.starred);

    const nhom = {
        homNay: [] as HoiThoai[],
        homQua: [] as HoiThoai[],
        truocDo: [] as HoiThoai[],
    };

    unstarred.forEach((ht) => {
        const ngay = new Date(ht.updated_at).toDateString();
        if (ngay === homNay) nhom.homNay.push(ht);
        else if (ngay === homQua) nhom.homQua.push(ht);
        else nhom.truocDo.push(ht);
    });

    const xoaHoiThoai = async (sessionId: string) => {
        if (dangXoa) return;
        setDangXoa(sessionId);
        setMenuMo(null);
        try {
            await fetch(`${API_URL}/api/conversations/${sessionId}`, { method: "DELETE" });
            onCapNhat?.();
        } catch (err) {
            console.error("Lỗi xóa:", err);
        } finally {
            setDangXoa(null);
        }
    };

    const doiTen = async (sessionId: string) => {
        if (!tenMoi.trim()) {
            setDangDoiTen(null);
            return;
        }
        try {
            await fetch(`${API_URL}/api/conversations/${sessionId}/rename`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: tenMoi.trim() }),
            });
            onCapNhat?.();
        } catch (err) {
            console.error("Lỗi đổi tên:", err);
        } finally {
            setDangDoiTen(null);
            setTenMoi("");
        }
    };

    const toggleStar = async (ht: HoiThoai) => {
        setMenuMo(null);
        try {
            await fetch(`${API_URL}/api/conversations/${ht.session_id}/star`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ starred: !ht.starred }),
            });
            onCapNhat?.();
        } catch (err) {
            console.error("Lỗi đánh sao:", err);
        }
    };

    const batDauDoiTen = (ht: HoiThoai) => {
        setMenuMo(null);
        setDangDoiTen(ht.session_id);
        setTenMoi(ht.title);
    };

    const renderItem = (ht: HoiThoai) => {
        const isActive = ht.session_id === sessionHienTai;
        const isRenaming = dangDoiTen === ht.session_id;

        return (
            <div
                key={ht.session_id}
                className={`history-item ${isActive ? "history-item--active" : ""}`}
            >
                {isRenaming ? (
                    <div className="history-item__rename">
                        <input
                            ref={inputRef}
                            className="history-item__rename-input"
                            value={tenMoi}
                            onChange={(e) => setTenMoi(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") doiTen(ht.session_id);
                                if (e.key === "Escape") setDangDoiTen(null);
                            }}
                            onBlur={() => doiTen(ht.session_id)}
                        />
                    </div>
                ) : (
                    <>
                        <button
                            className="history-item__btn"
                            onClick={() => onChonHoiThoai(ht.session_id)}
                        >
                            <span className="history-item__icon">
                                {ht.starred ? (
                                    <svg viewBox="0 0 24 24" fill="#0EA5E9" stroke="none" width="16" height="16">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                )}
                            </span>
                            <span className="history-item__title">{ht.title}</span>
                        </button>

                        {/* 3-dot menu */}
                        <div className="history-item__menu-wrapper" ref={menuMo === ht.session_id ? menuRef : null}>
                            <button
                                className="history-item__dots"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuMo(menuMo === ht.session_id ? null : ht.session_id);
                                }}
                                title="Tùy chọn"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                    <circle cx="12" cy="5" r="1.5" />
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="12" cy="19" r="1.5" />
                                </svg>
                            </button>

                            {menuMo === ht.session_id && (
                                <div className="history-item__context-menu">
                                    <button className="context-menu__item" onClick={() => toggleStar(ht)}>
                                        <svg viewBox="0 0 24 24" fill={ht.starred ? "#0EA5E9" : "none"} stroke={ht.starred ? "#0EA5E9" : "currentColor"} strokeWidth="2" width="14" height="14">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                        {ht.starred ? "Bỏ đánh sao" : "Đánh sao"}
                                    </button>
                                    <button className="context-menu__item" onClick={() => batDauDoiTen(ht)}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        Đổi tên
                                    </button>
                                    <button
                                        className="context-menu__item context-menu__item--danger"
                                        onClick={() => xoaHoiThoai(ht.session_id)}
                                        disabled={dangXoa === ht.session_id}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                        {dangXoa === ht.session_id ? "Đang xoá..." : "Xoá"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderNhom = (tieuDe: string, items: HoiThoai[]) => {
        if (items.length === 0) return null;
        return (
            <div className="history-group">
                {tieuDe && <h4 className="history-group__title">{tieuDe}</h4>}
                {items.map(renderItem)}
            </div>
        );
    };

    return (
        <div className="history-section">
            {danhSach.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: 16 }}>
                    Chưa có cuộc trò chuyện
                </p>
            ) : (
                <>
                    {starred.length > 0 && renderNhom("⭐ Yêu thích", starred)}
                    {renderNhom("", nhom.homNay)}
                    {renderNhom("Hôm qua", nhom.homQua)}
                    {renderNhom("7 ngày trước", nhom.truocDo)}
                </>
            )}
        </div>
    );
}
