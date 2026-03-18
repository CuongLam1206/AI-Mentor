"use client";

/**
 * Learnify Tutor AI – Tin nhắn User
 * Bubble bên phải, màu xanh dương.
 */

import { TinNhan } from "@/app/types/chat";

interface Props {
    tinNhan: TinNhan;
}

export default function UserMessage({ tinNhan }: Props) {
    const thoiGian = new Date(tinNhan.timestamp).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="msg-wrapper msg-wrapper--user">
            <div className="msg-bubble msg-bubble--user">
                <p className="msg-text">{tinNhan.content}</p>
            </div>
            <span className="msg-time msg-time--user">{thoiGian}</span>
        </div>
    );
}
