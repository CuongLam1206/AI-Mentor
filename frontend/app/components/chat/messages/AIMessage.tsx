"use client";

/**
 * Learnify Tutor AI – Tin nhắn AI v2.0
 * Avatar dùng BotAvatar SVG, glassmorphism bubble.
 */

import { TinNhan } from "@/app/types/chat";
import ReactMarkdown from "react-markdown";
import BotAvatar from "../BotAvatar";

interface Props {
    tinNhan: TinNhan;
}

export default function AIMessage({ tinNhan }: Props) {
    const thoiGian = new Date(tinNhan.timestamp).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const dangStream = tinNhan.trangThai === "dang_stream";

    return (
        <div className="msg-wrapper msg-wrapper--ai">
            <div className="msg-avatar">
                <BotAvatar size={36} />
            </div>
            <div className="msg-content-col">
                <div className={`msg-bubble msg-bubble--ai ${dangStream ? "msg-bubble--streaming" : ""}`}>
                    <div className="msg-text msg-text--markdown">
                        <ReactMarkdown>{tinNhan.content}</ReactMarkdown>
                    </div>
                    {dangStream && <span className="stream-cursor" />}
                </div>
                <span className="msg-time msg-time--ai">{thoiGian}</span>
            </div>
        </div>
    );
}
