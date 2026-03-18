"use client";

/**
 * SplitLayout – Fullscreen only mode
 * Chat chiếm toàn màn hình, không có toggle thu/phóng.
 */

import ChatPanel from "./ChatPanel";

export default function SplitLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
            <ChatPanel
                onDong={() => {}}
                fullScreen={true}
                onToggleFullScreen={() => {}}
            />
        </div>
    );
}
