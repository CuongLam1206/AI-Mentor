"use client";

import { Suspense } from "react";
import { useTokenAuth } from "@/app/hooks/useTokenAuth";
import ChatPanel from "./ChatPanel";

function SplitLayoutInner() {
    const { userId, ready } = useTokenAuth();

    if (!ready) return null;

    return (
        <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
            <ChatPanel
                onDong={() => {}}
                fullScreen={true}
                onToggleFullScreen={() => {}}
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
