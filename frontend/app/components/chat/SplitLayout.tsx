"use client";

import { usePathname } from "next/navigation";
import ChatPanel from "./ChatPanel";

export default function SplitLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Trên trang login, chỉ render children (không render chat)
    if (pathname === "/login") {
        return <>{children}</>;
    }

    // Tất cả các route khác: chat fullscreen
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
