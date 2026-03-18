"use client";

/**
 * Learnify Tutor AI – Input Bar v2.0
 * Theo mockup: context chips + input wrapper + mic/emoji + send button
 */

import { useState, useRef, useEffect } from "react";

interface Props {
    onGuiTinNhan: (noiDung: string) => void;
    dangXuLy: boolean;
    daKetNoi: boolean;
}

export default function ChatInputBar({ onGuiTinNhan, dangXuLy, daKetNoi }: Props) {
    const [noiDung, setNoiDung] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const xuLyGui = () => {
        const text = noiDung.trim();
        if (!text || dangXuLy || !daKetNoi) return;
        onGuiTinNhan(text);
        setNoiDung("");
        if (inputRef.current) inputRef.current.style.height = "auto";
    };

    const xuLyPhim = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            xuLyGui();
        }
    };

    const xuLyThayDoi = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNoiDung(e.target.value);
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    };

    return (
        <div className="chat-bottom">
            {/* Input area */}
            <div className="chat-input">
                <div className="chat-input__wrapper">
                    {/* Plus button */}
                    <button className="chat-input__add-btn" title="Thêm tệp">+</button>

                    {/* Textarea */}
                    <textarea
                        ref={inputRef}
                        className="chat-input__textarea"
                        value={noiDung}
                        onChange={xuLyThayDoi}
                        onKeyDown={xuLyPhim}
                        placeholder={
                            !daKetNoi ? "Đang kết nối..." : dangXuLy ? "AI đang trả lời..." : "Hỏi bất cứ điều gì..."
                        }
                        disabled={!daKetNoi}
                        rows={1}
                    />

                    {/* Action buttons */}
                    <div className="chat-input__actions">
                        <button className="input-action-btn" title="Ghi âm">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </button>
                        <button className="input-action-btn" title="Emoji">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                <line x1="9" y1="9" x2="9.01" y2="9" />
                                <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Send button */}
                <button
                    className={`chat-input__send ${noiDung.trim() && !dangXuLy && daKetNoi ? "chat-input__send--active" : ""
                        }`}
                    onClick={xuLyGui}
                    disabled={!noiDung.trim() || dangXuLy || !daKetNoi}
                    title="Gửi tin nhắn"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
