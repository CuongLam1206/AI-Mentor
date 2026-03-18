"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || "learnify2025";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const auth = localStorage.getItem("learnify_auth");
        if (auth) router.replace("/");
    }, [router]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!username.trim()) { setError("Vui lòng nhập tên người dùng"); return; }
        if (password !== APP_PASSWORD) { setError("Mật khẩu không đúng"); return; }
        setLoading(true);
        localStorage.setItem("learnify_auth", JSON.stringify({ username: username.trim(), loggedIn: true }));
        setTimeout(() => router.replace("/"), 300);
    };

    return (
        <div style={styles.bg}>
            <div style={styles.card}>
                {/* Logo */}
                <div style={styles.logoWrap}>
                    <div style={styles.logoRing}>
                        <span style={{ fontSize: 36 }}>🎓</span>
                    </div>
                    <h1 style={styles.brand}>Learnify AI</h1>
                    <p style={styles.subtitle}>AI Tutor cá nhân hóa của bạn</p>
                </div>

                <form onSubmit={handleLogin} style={styles.form}>
                    <div style={styles.field}>
                        <label style={styles.label}>Tên người dùng</label>
                        <input
                            style={styles.input}
                            type="text"
                            placeholder="Nhập tên của bạn..."
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Mật khẩu</label>
                        <input
                            style={styles.input}
                            type="password"
                            placeholder="Nhập mật khẩu..."
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <p style={styles.error}>⚠️ {error}</p>}
                    <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                        {loading ? "Đang đăng nhập..." : "Đăng nhập →"}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    bg: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
    },
    card: {
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 24,
        padding: "48px 40px",
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
    },
    logoWrap: { textAlign: "center", marginBottom: 36 },
    logoRing: {
        width: 80, height: 80, borderRadius: "50%",
        background: "linear-gradient(135deg, #7c6fe0, #5b4fcf)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
        boxShadow: "0 0 40px rgba(124,111,224,0.5)",
    },
    brand: { fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 6px" },
    subtitle: { fontSize: 14, color: "rgba(255,255,255,0.55)", margin: 0 },
    form: { display: "flex", flexDirection: "column", gap: 18 },
    field: { display: "flex", flexDirection: "column", gap: 7 },
    label: { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" },
    input: {
        padding: "12px 16px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 12,
        color: "#fff",
        fontSize: 14,
        outline: "none",
        transition: "border 0.2s",
    },
    error: { fontSize: 13, color: "#ff6b6b", margin: 0, padding: "8px 12px", background: "rgba(255,107,107,0.1)", borderRadius: 8 },
    btn: {
        padding: "14px",
        background: "linear-gradient(135deg, #7c6fe0, #5b4fcf)",
        border: "none",
        borderRadius: 12,
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        marginTop: 4,
        boxShadow: "0 8px 24px rgba(124,111,224,0.4)",
        transition: "all 0.2s",
    },
};
