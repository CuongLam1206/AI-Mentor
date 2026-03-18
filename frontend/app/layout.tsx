import type { Metadata } from "next";
import "./globals.css";
import "./components/chat/chat.css";
import SplitLayout from "./components/chat/SplitLayout";
import AuthGate from "./components/AuthGate";

export const metadata: Metadata = {
    title: "Learnify – AI Tutor cá nhân hóa",
    description: "Learnify – Nền tảng học trực tuyến thông minh với AI Tutor cá nhân hóa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body suppressHydrationWarning>
                <AuthGate>
                    <SplitLayout>{children}</SplitLayout>
                </AuthGate>
            </body>
        </html>
    );
}
