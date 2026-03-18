import "../components/chat/chat.css";
import SplitLayout from "../components/chat/SplitLayout";
import AuthGate from "../components/AuthGate";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGate>
            <SplitLayout>{children}</SplitLayout>
        </AuthGate>
    );
}
