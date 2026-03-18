"use client";

import { Suspense } from "react";
import { useTokenAuth } from "@/app/hooks/useTokenAuth";
import ChatPanel from "./ChatPanel";

function SplitLayoutInner() {
    const { userId, ready } = useTokenAuth();

    if (!ready) return null;

    // Detect xem đang trong iframe (Learnify embed) hay tab mới
    const isInIframe = typeof window !== "undefined" && window.self !== window.top;

    // Mở tab mới với cùng URL (giữ nguyên token + user params)
    const openNewTab = () => {
        window.open(window.location.href, "_blank");
    };

    return (
        <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
            <ChatPanel
                onDong={() => {}}
                fullScreen={!isInIframe}
                onToggleFullScreen={isInIframe ? openNewTab : undefined}
                userId={userId}
            />
        </div>
    );
}

// Suspense bắt buộc vì useSearchParams cần Suspense boundary trong Next.js
export default function SplitLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <SplitLayoutInner />
        </Suspense>
    );
}
