"use client";

/**
 * Learnify Tutor AI – Header panel chat
 * Hiện tiêu đề, trạng thái kết nối, nút đóng/thu nhỏ.
 */

import { TrangThaiKetNoi } from "@/app/types/chat";

interface Props {
    trangThaiKetNoi: TrangThaiKetNoi;
    onDong: () => void;
    onTaoMoi: () => void;
}

export default function ChatHeader({ trangThaiKetNoi, onDong, onTaoMoi }: Props) {
    const labelKetNoi: Record<TrangThaiKetNoi, { text: string; class: string }> = {
        da_ket_noi: { text: "Đã kết nối", class: "status--online" },
        dang_ket_noi: { text: "Đang kết nối...", class: "status--connecting" },
        mat_ket_noi: { text: "Mất kết nối", class: "status--offline" },
    };

    const ketNoi = labelKetNoi[trangThaiKetNoi];

    return (
        <div className="chat-header">
            <div className="chat-header__info">
                <div className="chat-header__title-row">
                    <span className="chat-header__logo">🎓</span>
                    <h2 className="chat-header__title">Learnify Tutor AI</h2>
                </div>
                <div className="chat-header__status-row">
                    <span className={`chat-header__status ${ketNoi.class}`}>
                        <span className="status-dot"></span>
                        {ketNoi.text}
                    </span>
                    <span className="chat-header__version">v1.0</span>
                </div>
            </div>
            <div className="chat-header__actions">
                <button
                    className="chat-header__btn"
                    onClick={onTaoMoi}
                    title="Cuộc trò chuyện mới"
                >
                    ✚
                </button>
                <button
                    className="chat-header__btn chat-header__btn--close"
                    onClick={onDong}
                    title="Đóng"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
