"use client";

/**
 * Learnify Tutor AI – Split Screen Wrapper
 *
 * Auth flow (server-side verification):
 *   URL params: ?id=B&signature=D
 *   Frontend gửi {id, signature} lên /api/auth/verify (Next.js API route)
 *   Server verify D' = B + secret === D → trả về userId = decode(B)
 *   Key C (shared secret) KHÔNG bao giờ xuất hiện trong browser.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import ChatPanel from "./ChatPanel";

const MIN_CHAT_WIDTH = 380;
const MAX_CHAT_RATIO = 0.75;
const DEFAULT_CHAT_WIDTH = 520;

export default function ChatPanelWrapper() {
  const [daMo, setDaMo] = useState(false);
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const [userId, setUserId] = useState<string | null>(null); // null = chưa verify
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const signature = params.get("signature");

    if (id && signature) {
      // Gửi lên server để verify (key C không lộ ra client)
      fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, signature }),
      })
        .then(async (res) => {
          if (res.ok) {
            const { userId: verifiedUserId } = await res.json();
            setUserId(verifiedUserId);
          } else {
            setAuthError(true);
          }
        })
        .catch(() => setAuthError(true));
      return;
    }

    // Backward-compat: ?user= cũ (không cần signature)
    const legacyUser = params.get("user");
    setUserId(legacyUser || "default");
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = chatWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }, [chatWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const diff = startX.current - e.clientX;
      const newWidth = Math.min(
        window.innerWidth * MAX_CHAT_RATIO,
        Math.max(MIN_CHAT_WIDTH, startWidth.current + diff)
      );
      setChatWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Reject nếu sai signature
  if (authError) return null;

  // Chờ verify xong mới render
  if (userId === null) return null;

  return (
    <>
      {/* Toggle Button */}
      {!daMo && (
        <button
          className="agent-toggle"
          onClick={() => setDaMo(true)}
          aria-label="Mở Learnify AI Agent"
        >
          <span className="agent-toggle__pulse" />
          <span className="agent-toggle__icon">✦</span>
          <span className="agent-toggle__label">Agent</span>
          <div className="agent-toggle__tooltip">Learnify AI Tutor 😊</div>
        </button>
      )}

      {/* Split Panel */}
      {daMo && (
        <div
          className="chat-split-panel"
          style={{ width: chatWidth }}
        >
          {/* Drag Handle */}
          <div
            className="chat-split-handle"
            onMouseDown={handleMouseDown}
          >
            <div className="chat-split-handle__grip" />
          </div>

          {/* Chat Content */}
          <div className="chat-split-content">
            <ChatPanel onDong={() => setDaMo(false)} userId={userId} />
          </div>
        </div>
      )}
    </>
  );
}
