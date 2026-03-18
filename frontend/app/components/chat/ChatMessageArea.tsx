"use client";

/**
 * Learnify Tutor AI – Vùng tin nhắn v3.0
 * Phase 3: Goal-aware follow-up chips after last AI reply.
 * Feature C: Pin (📌) button on AI messages to save notes.
 * Layout: Gemini-style centered column (max-width 800px).
 */

import { useEffect, useRef, useState } from "react";
import { TinNhan } from "@/app/types/chat";
import UserMessage from "./messages/UserMessage";
import AIMessage from "./messages/AIMessage";
import TypingIndicator from "./messages/TypingIndicator";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Goal-aware follow-up chips that appear after the last AI message
const FOLLOWUP_CHIPS = [
    { icon: "📝", label: "Giải thích thêm", msg: "Bạn có thể giải thích thêm về điều đó không?" },
    { icon: "💡", label: "Ví dụ cụ thể", msg: "Hãy cho tôi một ví dụ cụ thể về nội dung vừa rồi." },
    { icon: "🧠", label: "Làm quiz về chủ đề này", isQuiz: true },
    { icon: "🔗", label: "Liên hệ thực tế", msg: "Điều này ứng dụng trong thực tế như thế nào?" },
];

interface Props {
    danhSachTinNhan: TinNhan[];
    dangXuLy: boolean;
    lastCompletedMsgId?: string | null;
    onFollowUpChip?: (msg: string) => void;
    onOpenQuiz?: (topic: string) => void;
    onOpenNotes?: () => void;
    userId?: string;
    sessionId?: string;
}

export default function ChatMessageArea({
    danhSachTinNhan,
    dangXuLy,
    lastCompletedMsgId,
    onFollowUpChip,
    onOpenQuiz,
    onOpenNotes,
    userId = "default",
    sessionId,
}: Props) {
    const cuoiRef = useRef<HTMLDivElement>(null);
    const [pinnedId, setPinnedId] = useState<string | null>(null);

    useEffect(() => {
        cuoiRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [danhSachTinNhan, dangXuLy]);

    // Find the last AI message index for chip placement
    const lastAiIdx = (() => {
        for (let i = danhSachTinNhan.length - 1; i >= 0; i--) {
            if (danhSachTinNhan[i].role === "assistant") return i;
        }
        return -1;
    })();

    const pinMessage = async (msg: TinNhan) => {
        const excerpt = msg.content.replace(/[#*`_]/g, "").trim().slice(0, 300);
        try {
            await fetch(`${API_URL}/api/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, content: excerpt, source: "chat", session_id: sessionId }),
            });
            setPinnedId(msg.id);
            setTimeout(() => setPinnedId(null), 2000);
        } catch { /* ignore */ }
    };

    return (
        /* Outer scroller — full height, handles scrollbar */
        <div className={`chat-messages-scroller ${danhSachTinNhan.length === 0 && !dangXuLy ? "chat-messages--welcome" : ""}`}>
            {/* Inner column — Gemini-style centered max-width */}
            <div className="chat-messages-inner">
                {danhSachTinNhan.map((tinNhan, idx) => (
                    <div key={tinNhan.id} style={{ position: "relative", display: "flex", flexDirection: "column" }}>
                        {tinNhan.role === "user" ? (
                            <UserMessage tinNhan={tinNhan} />
                        ) : (
                            <div className="ai-msg-wrapper">
                                <AIMessage tinNhan={tinNhan} />
                                <button
                                    className={`pin-btn ${pinnedId === tinNhan.id ? "pin-btn--saved" : ""}`}
                                    title="Lưu ghi chú"
                                    onClick={() => pinMessage(tinNhan)}
                                >
                                    {pinnedId === tinNhan.id ? "✅" : "📌"}
                                </button>
                            </div>
                        )}
                        {/* Follow-up chips after LAST completed AI reply */}
                        {tinNhan.role === "assistant"
                            && idx === lastAiIdx
                            && tinNhan.id === lastCompletedMsgId
                            && !dangXuLy
                            && onFollowUpChip
                            && (
                                <div className="followup-chips">
                                    {FOLLOWUP_CHIPS.map(chip => (
                                        <button
                                            key={chip.label}
                                            className="followup-chip"
                                            onClick={() => {
                                                if (chip.isQuiz && onOpenQuiz) {
                                                    // Find the user message that triggered this AI reply
                                                    const userMsg = [...danhSachTinNhan].slice(0, idx).reverse().find(m => m.role === "user");
                                                    const aiContent = tinNhan.content;

                                                    // Priority 1: Heading in AI message (e.g. ## IELTS Reading)
                                                    const headingMatch = aiContent.match(/^#{1,3}\s+(.+)$/m);

                                                    // Priority 2: Use user's message as it directly reflects intent
                                                    // Extract the core subject (remove question words)
                                                    const userText = userMsg?.content
                                                        ?.replace(/^(hôm nay|hãy|cho tôi|bạn có thể|giải thích|cho biết|nói về|tôi muốn hỏi về)\s*/gi, "")
                                                        ?.trim()
                                                        ?.slice(0, 80) || "";

                                                    // Priority 3: Domain keywords from AI content
                                                    const domainMatch = aiContent.match(/\b(IELTS [A-Za-z]+|Reading|Listening|Writing|Speaking|Toán\s+\w+|Python\s+\w+|Giải tích|Đại số|Xác suất|Hình học|Grammar|Vocabulary|Từ vựng|Ngữ pháp)\b/i);

                                                    // Priority 4: First bold phrase that is NOT a generic word
                                                    const boldMatches = [...aiContent.matchAll(/\*\*([^*]{4,60})\*\*/g)];
                                                    const meaningfulBold = boldMatches.find(m => {
                                                        const t = m[1].toLowerCase();
                                                        return !["ví dụ", "lưu ý", "quan trọng", "bước", "cách", "mẹo", "chú ý", "kết quả", "giải thích"].some(skip => t.startsWith(skip));
                                                    });

                                                    const topic = (
                                                        headingMatch?.[1] ||
                                                        domainMatch?.[1] ||
                                                        meaningfulBold?.[1] ||
                                                        userText ||
                                                        aiContent.replace(/[#*`]/g, "").trim().slice(0, 80)
                                                    ).trim();

                                                    onOpenQuiz(topic);
                                                } else if (chip.msg && onFollowUpChip) {
                                                    onFollowUpChip(chip.msg);
                                                }
                                            }}
                                        >
                                            <span>{chip.icon}</span>
                                            <span>{chip.label}</span>
                                        </button>
                                    ))}
                                    {onOpenNotes && (
                                        <button className="followup-chip followup-chip--notes" onClick={onOpenNotes}>
                                            <span>📌</span><span>Ghi chú của tôi</span>
                                        </button>
                                    )}
                                </div>
                            )}
                    </div>
                ))}

                {dangXuLy && <TypingIndicator />}
                <div ref={cuoiRef} />
            </div>
        </div>
    );
}
