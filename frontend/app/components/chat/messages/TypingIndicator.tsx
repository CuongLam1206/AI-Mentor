"use client";

/**
 * Learnify Tutor AI – Typing Indicator v2.0
 */

import BotAvatar from "../BotAvatar";

export default function TypingIndicator() {
    return (
        <div className="msg-wrapper msg-wrapper--ai">
            <div className="msg-avatar">
                <BotAvatar size={36} />
            </div>
            <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
            </div>
        </div>
    );
}
