"use client";

/**
 * SplitLayout – Antigravity Style với Full Screen Mode
 * - Split panel: chat trượt từ phải, kéo resize được
 * - Full Screen: chat chiếm toàn màn, sidebar history bên trái như Gemini
 * FIX: ChatPanel is always mounted (never remounted) to preserve session state
 * when toggling fullscreen/split mode.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import ChatPanel from "./ChatPanel";

const DEFAULT_CHAT_WIDTH = 480;
const MIN_CHAT_WIDTH = 360;
const MAX_CHAT_RATIO = 0.6;

// Default position: bottom-right
const DEFAULT_POS = { right: 28, bottom: 28 };
const STORAGE_KEY = "learnify-agent-pos";

export default function SplitLayout({ children }: { children: React.ReactNode }) {
    const [chatMo, setChatMo] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);
    const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    // ===== Agent button drag state =====
    const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const isDraggingBtn = useRef(false);
    const dragStart = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
    const dragMoved = useRef(false);

    // Load saved position from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const { x, y } = JSON.parse(saved);
                setBtnPos({ x, y });
            } else {
                // Convert default right/bottom to x/y
                setBtnPos({
                    x: window.innerWidth - DEFAULT_POS.right - 140,
                    y: window.innerHeight - DEFAULT_POS.bottom - 48,
                });
            }
        } catch {
            setBtnPos({ x: window.innerWidth - 170, y: window.innerHeight - 80 });
        }
    }, []);

    const handleBtnMouseDown = (e: React.MouseEvent) => {
        if (!btnRef.current || !btnPos) return;
        isDraggingBtn.current = true;
        dragMoved.current = false;
        dragStart.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            btnX: btnPos.x,
            btnY: btnPos.y,
        };
        e.preventDefault();
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDraggingBtn.current || !btnRef.current) return;
            const dx = e.clientX - dragStart.current.mouseX;
            const dy = e.clientY - dragStart.current.mouseY;
            if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved.current = true;
            const btnW = btnRef.current.offsetWidth || 130;
            const btnH = btnRef.current.offsetHeight || 44;
            const newX = Math.max(8, Math.min(window.innerWidth - btnW - 8, dragStart.current.btnX + dx));
            const newY = Math.max(8, Math.min(window.innerHeight - btnH - 8, dragStart.current.btnY + dy));
            setBtnPos({ x: newX, y: newY });
        };
        const onMouseUp = () => {
            if (!isDraggingBtn.current) return;
            isDraggingBtn.current = false;
            if (btnPos) {
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(btnPos)); } catch {}
            }
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [btnPos]);

    // Save after drag ends
    const handleBtnMouseUp = () => {
        if (btnPos) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(btnPos)); } catch {}
        }
    };

    const handleBtnClick = () => {
        // Only open chat if it was a click, not a drag
        if (!dragMoved.current) setChatMo(true);
    };

    // ==================================

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
            const maxW = window.innerWidth * MAX_CHAT_RATIO;
            const newWidth = Math.min(maxW, Math.max(MIN_CHAT_WIDTH, startWidth.current + diff));
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

    const handleDong = () => {
        setChatMo(false);
        setFullScreen(false);
    };

    const handleToggleFullScreen = () => {
        setFullScreen(f => !f);
    };

    const chatPanelStyle: React.CSSProperties = chatMo
        ? fullScreen
            ? { position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 1000 }
            : { width: chatWidth, flexShrink: 0, height: "100%" }
        : { display: "none" };

    return (
        <div className="split-root">
            {/* Nội dung chính – co lại khi chat mở (split mode) */}
            <div
                className="split-main"
                style={chatMo && !fullScreen ? { width: `calc(100vw - ${chatWidth}px - 5px)` } : undefined}
            >
                {children}

                {/* Agent toggle – draggable, Antigravity style */}
                {!chatMo && btnPos && (
                    <button
                        ref={btnRef}
                        className="agent-toggle"
                        style={{ left: btnPos.x, top: btnPos.y, bottom: "auto", right: "auto", cursor: isDraggingBtn.current ? "grabbing" : "grab" }}
                        onMouseDown={handleBtnMouseDown}
                        onMouseUp={handleBtnMouseUp}
                        onClick={handleBtnClick}
                        aria-label="Mở Learnify AI Agent"
                    >
                        <span className="agent-toggle__pulse" />
                        <span className="agent-toggle__icon">✦</span>
                        <span className="agent-toggle__label">Agent</span>
                        <div className="agent-toggle__tooltip">Kéo để di chuyển · Click để mở 😊</div>
                    </button>
                )}
            </div>

            {/* Drag handle – chỉ hiện trong split mode */}
            {chatMo && !fullScreen && (
                <div className="split-handle" onMouseDown={handleMouseDown}>
                    <div className="split-handle__grip" />
                </div>
            )}

            {/* ===== ChatPanel – luôn mount, chỉ thay style ===== */}
            <div className="split-chat" style={chatPanelStyle}>
                <ChatPanel
                    onDong={handleDong}
                    fullScreen={fullScreen}
                    onToggleFullScreen={handleToggleFullScreen}
                />
            </div>
        </div>
    );
}

