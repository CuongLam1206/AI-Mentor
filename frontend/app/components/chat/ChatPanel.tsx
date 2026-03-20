"use client";

/**
 * Learnify Tutor AI – Chat Panel v3.0
 * Layout: Collapsible left sidebar (ChatGPT style) + Main chat
 * Right sidebar ẩn mặc định, left sidebar toggle ẩn/hiện.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { TinNhan, HoiThoai } from "@/app/types/chat";
import { useChatWebSocket, PageContext } from "@/app/hooks/useChatWebSocket";
import ChatMessageArea from "./ChatMessageArea";
import ChatInputBar from "./ChatInputBar";
import ChatHistory from "./ChatHistory";
import BotAvatar from "./BotAvatar";
import ProfileScreen from "./ProfileScreen";
import GoalsScreen from "./GoalsScreen";
import QuizModal from "./QuizModal";
import RecommendationsPanel from "./RecommendationsPanel";
import NotesPanel from "./NotesPanel";
import "./settings-screens.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-mentor-iwkf.onrender.com";

interface Props {
    onDong: () => void;
    fullScreen?: boolean;
    onToggleFullScreen?: () => void;
    userId?: string;
}

export default function ChatPanel({ onDong, fullScreen, onToggleFullScreen, userId = "guest" }: Props) {
    const [sessionId, setSessionId] = useState(() => taoSessionId());
    const [danhSachTinNhan, setDanhSachTinNhan] = useState<TinNhan[]>([]);
    const [dangXuLy, setDangXuLy] = useState(false);
    const [lichSuHoiThoai, setLichSuHoiThoai] = useState<HoiThoai[]>([]);
    const [hienSidebar, setHienSidebar] = useState(false);
    const [activeScreen, setActiveScreen] = useState<"chat" | "profile" | "goals">("chat");

    // Sidebar panel: "none" = history, "favorites" = yêu thích
    const [activeSidebarPanel, setActiveSidebarPanel] = useState<"none" | "favorites">("none");

    // Phase 2: Smart Interactions
    const [greeting, setGreeting] = useState<string | null>(null);
    const [nudge, setNudge] = useState<{ message: string; days_since: number } | null>(null);
    const [nudgeDismissed, setNudgeDismissed] = useState(false);

    // Phase 3: Quiz, Recommendations & Streak
    const [showQuiz, setShowQuiz] = useState(false);
    const [showRecs, setShowRecs] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [quizContext, setQuizContext] = useState<{ goalTitle?: string; topic?: string }>({})
    const [streak, setStreak] = useState<number>(0);
    const [lastCompletedMsgId, setLastCompletedMsgId] = useState<string | null>(null);
    // Feature D: study-schedule check-in
    const [checkinDismissed, setCheckinDismissed] = useState(false);
    const [showCheckin, setShowCheckin] = useState(false);

    const openFavorites = () => { setActiveSidebarPanel("favorites"); setHienSidebar(true); setHienSettings(false); };
    const closeSidebarPanel = () => setActiveSidebarPanel("none");
    const openScreen = (screen: "profile" | "goals") => { setActiveScreen(screen); setHienSidebar(false); setHienSettings(false); };

    // Sidebar chỉ mở khi fullscreen, đóng khi thoát
    useEffect(() => {
        setHienSidebar(!!fullScreen);
    }, [fullScreen]);

    // Feature D: Check study schedule every minute, show banner within 30 min of scheduled time
    useEffect(() => {
        let schedule: { hour: number; minute: number; days: number[] } | null = null;

        // Load schedule once
        fetch(`${API_URL}/api/study-schedule?user_id=${userId}`)
            .then(r => r.json())
            .then(d => { if (d.schedule) schedule = d.schedule; })
            .catch(() => {});

        const checkNow = () => {
            if (!schedule) return;
            const now = new Date();
            const currentDay = now.getDay();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const scheduledMinutes = schedule.hour * 60 + (schedule.minute ?? 0);
            const days = schedule.days ?? [1, 2, 3, 4, 5];

            // Match within 0–29 minutes AFTER scheduled time on correct day
            const diff = currentMinutes - scheduledMinutes;
            if (days.includes(currentDay) && diff >= 0 && diff < 30) {
                setShowCheckin(true);
                setCheckinDismissed(false); // reset each time we enter the window
            }
        };

        checkNow();
        const interval = setInterval(checkNow, 60_000);
        return () => clearInterval(interval);
    }, []);

    const [courseContext, setCourseContext] = useState<{ courseId: string; title: string; category: string; description: string; progress: number } | null>(null);

    // === WebSocket callbacks ===
    const khiBatDauStream = useCallback((messageId: string) => {
        setDangXuLy(false);
        const tinNhanMoi: TinNhan = {
            id: messageId,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
            trangThai: "dang_stream",
        };
        setDanhSachTinNhan((prev) => [...prev, tinNhanMoi]);
    }, []);

    const khiNhanDoanStream = useCallback((messageId: string, chunk: string) => {
        setDanhSachTinNhan((prev) =>
            prev.map((msg) =>
                msg.id === messageId ? { ...msg, content: msg.content + chunk } : msg
            )
        );
    }, []);

    const khiKetThucStream = useCallback((messageId: string, fullContent: string) => {
        setDanhSachTinNhan((prev) =>
            prev.map((msg) =>
                msg.id === messageId
                    ? { ...msg, content: fullContent, trangThai: "hoan_thanh" }
                    : msg
            )
        );
        setLastCompletedMsgId(messageId);
    }, []);

    const khiLoi = useCallback((error: string) => {
        setDangXuLy(false);
        const tinNhanLoi: TinNhan = {
            id: `err_${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${error}`,
            timestamp: new Date().toISOString(),
            trangThai: "loi",
        };
        setDanhSachTinNhan((prev) => [...prev, tinNhanLoi]);
    }, []);

    const { trangThai, ketNoi, guiTinNhan, guiGreeting, ngatKetNoi } = useChatWebSocket({
        sessionId,
        userId,
        khiBatDauStream,
        khiNhanDoanStream,
        khiKetThucStream,
        khiLoi,
    });

    useEffect(() => {
        ketNoi();
        taiLichSu();
        if (danhSachTinNhan.length === 0) {
            const pageCtx: PageContext = { page: activeScreen };
            if (courseContext) {
                pageCtx.course_id = courseContext.courseId;
                pageCtx.course_name = courseContext.title;
                pageCtx.progress = courseContext.progress;
            }
            setTimeout(() => guiGreeting(pageCtx), 800);
        }
        return () => ngatKetNoi();
    }, [sessionId]);

    // Lắng nghe course context từ trang chính
    useEffect(() => {
        // Đọc context đã lưu (nếu user chọn khóa trước khi mở chat)
        if ((window as any).__learnifyContext) {
            setCourseContext((window as any).__learnifyContext);
        }
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            setCourseContext(detail);
        };
        window.addEventListener("learnify:course-context", handler);
        return () => window.removeEventListener("learnify:course-context", handler);
    }, []);

    // Phase 2: Fetch greeting + nudge + streak on mount
    useEffect(() => {
        fetch(`${API_URL}/api/greeting?user_id=${userId}`)
            .then(r => r.json())
            .then(d => { if (d.greeting) setGreeting(d.greeting); })
            .catch(() => {});
        fetch(`${API_URL}/api/nudge?user_id=${userId}`)
            .then(r => r.json())
            .then(d => { if (d.nudge) setNudge(d.nudge); })
            .catch(() => {});
        // Phase 3: streak
        fetch(`${API_URL}/api/streak?user_id=${userId}`)
            .then(r => r.json())
            .then(d => { if (d.streak) setStreak(d.streak); })
            .catch(() => {});
    }, []);

    const xuLyGuiTinNhan = (noiDung: string) => {
        const tinNhanUser: TinNhan = {
            id: `user_${Date.now()}`,
            role: "user",
            content: noiDung,
            timestamp: new Date().toISOString(),
            trangThai: "da_gui",
        };
        setDanhSachTinNhan((prev) => [...prev, tinNhanUser]);
        setDangXuLy(true);
        // Truyền page context qua WS payload thay vì nhúc vào nội dung
        const pageCtx: PageContext = { page: activeScreen };
        if (courseContext) {
            pageCtx.course_id = courseContext.courseId;
            pageCtx.course_name = courseContext.title;
            pageCtx.progress = courseContext.progress;
        }
        const thanhCong = guiTinNhan(noiDung, pageCtx);
        if (!thanhCong) {
            khiLoi("Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối.");
        }
    };

    const taiLichSu = async () => {
        try {
            const res = await fetch(`${API_URL}/api/conversations?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setLichSuHoiThoai(data.conversations || []);
            }
        } catch {
            console.log("Không thể tải lịch sử");
        }
    };

    const chonHoiThoai = async (sid: string) => {
        ngatKetNoi();
        setSessionId(sid);
        setDanhSachTinNhan([]);
        setDangXuLy(false);
        setHienSidebar(false); // Đóng sidebar khi chọn hội thoại
        try {
            const res = await fetch(`${API_URL}/api/conversations/${sid}`);
            if (res.ok) {
                const data = await res.json();
                const tinNhan: TinNhan[] = (data.messages || []).map(
                    (msg: any, i: number) => ({
                        id: `loaded_${i}`,
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp || new Date().toISOString(),
                        trangThai: "hoan_thanh" as const,
                    })
                );
                setDanhSachTinNhan(tinNhan);
            }
        } catch {
            console.log("Không thể tải hội thoại");
        }
    };

    const taoHoiThoaiMoi = () => {
        ngatKetNoi();
        setSessionId(taoSessionId());
        setDanhSachTinNhan([]);
        setDangXuLy(false);
        setHienSidebar(false);
    };

    // Tiêu đề phiên – luôn hiện "Learnify" giống Gemini
    const tieuDe = "Learnify";

    const [searchQuery, setSearchQuery] = useState("");
    const [hienSettings, setHienSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Close settings on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setHienSettings(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filteredHistory = searchQuery.trim()
        ? lichSuHoiThoai.filter(ht => ht.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : lichSuHoiThoai;
    const starrCount = lichSuHoiThoai.filter(ht => ht.starred).length;

    const xoaTatCa = async () => {
        if (!confirm("Bạn có chắc muốn xoá toàn bộ lịch sử chat?")) return;
        setHienSettings(false);
        try {
            await fetch(`${API_URL}/api/conversations`, { method: "DELETE" });
            taiLichSu();
            taoHoiThoaiMoi();
        } catch (err) {
            console.error("Lỗi xoá tất cả:", err);
        }
    };

    return (
        <div className="chat-layout">
            {/* ===== COLLAPSIBLE LEFT SIDEBAR ===== */}
            <aside className={`chat-sidebar ${hienSidebar ? "chat-sidebar--open" : ""}`}>
                <div className="chat-sidebar__header">
                    {activeSidebarPanel === "favorites" ? (
                        <>
                            <button className="chat-sidebar__new" style={{ gap: 6 }} onClick={closeSidebarPanel} title="Quay lại">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6" /></svg>
                                ⭐ Yêu thích
                            </button>
                            <button className="chat-sidebar__close" onClick={() => setHienSidebar(false)} title="Đóng">✕</button>
                        </>
                    ) : (
                        <>
                            <button className="chat-sidebar__new" onClick={taoHoiThoaiMoi} title="Chat mới">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Chat mới
                            </button>
                            <button className="chat-sidebar__close" onClick={() => setHienSidebar(false)} title="Đóng sidebar">✕</button>
                        </>
                    )}
                </div>

                {/* Search Bar - hide when showing a panel */}
                {activeSidebarPanel === "none" && (
                <div className="chat-sidebar__search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="chat-sidebar__search-input"
                        type="text"
                        placeholder="Tìm kiếm cuộc trò chuyện..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="chat-sidebar__search-clear" onClick={() => setSearchQuery("")}>✕</button>
                    )}
                </div>
                )}

                {/* Fixed nav — does NOT scroll */}
                {activeSidebarPanel === "none" && (
                    <div className="chat-sidebar__fixed-nav">
                        {/* Profile & Goals shortcuts */}
                        <div className="sidebar-pinned-nav">
                            <button
                                className={`sidebar-pinned-nav__item ${activeScreen === "profile" ? "sidebar-pinned-nav__item--active" : ""}`}
                                onClick={() => openScreen("profile")}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                Hồ sơ học viên
                            </button>
                            <button
                                className={`sidebar-pinned-nav__item ${activeScreen === "goals" ? "sidebar-pinned-nav__item--active" : ""}`}
                                onClick={() => openScreen("goals")}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                                Mục tiêu & Lộ trình
                            </button>
                        </div>

                        {/* Starred favorites — fixed, above scroll */}
                        {lichSuHoiThoai.filter(h => h.starred).length > 0 && (
                            <div className="chat-sidebar__fixed-starred">
                                <ChatHistory
                                    danhSach={lichSuHoiThoai.filter(h => h.starred)}
                                    sessionHienTai={sessionId}
                                    onChonHoiThoai={chonHoiThoai}
                                    onCapNhat={taiLichSu}
                                />
                            </div>
                        )}

                        {/* Section label for scrollable area */}
                        <div className="sidebar-section-label" style={{ padding: "6px 14px 2px", borderTop: "1px solid var(--border)", marginTop: 4 }}>Lịch sử trò chuyện</div>
                    </div>
                )}

                {/* Scrollable unstarred conversations only */}
                <div className="chat-sidebar__history">
                    {activeSidebarPanel === "favorites" ? (
                        <ChatHistory
                            danhSach={lichSuHoiThoai.filter(h => h.starred)}
                            sessionHienTai={sessionId}
                            onChonHoiThoai={(sid) => { chonHoiThoai(sid); closeSidebarPanel(); }}
                            onCapNhat={taiLichSu}
                        />
                    ) : (
                        <ChatHistory
                            danhSach={filteredHistory.filter(h => !h.starred)}
                            sessionHienTai={sessionId}
                            onChonHoiThoai={chonHoiThoai}
                            onCapNhat={taiLichSu}
                        />
                    )}
                </div>

                {/* Bottom Settings */}
                <div className="chat-sidebar__bottom" ref={settingsRef}>
                    {/* Settings Popup */}
                    {hienSettings && (
                        <div className="chat-sidebar__settings-menu">
                            <button className={`settings-menu__item ${activeSidebarPanel === "favorites" ? "settings-menu__item--active" : ""}`}
                                onClick={() => openFavorites()}
                            >
                                <svg viewBox="0 0 24 24" fill={activeSidebarPanel === "favorites" ? "#facc15" : "none"} stroke="currentColor" strokeWidth="2" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                Hội thoại yêu thích {starrCount > 0 && <span style={{ marginLeft: "auto", background: "#facc15", color: "#854d0e", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{starrCount}</span>}
                            </button>
                            <button className="settings-menu__item" onClick={xoaTatCa}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                Xoá tất cả lịch sử
                            </button>
                            <div className="settings-menu__divider" />
                            <button className="settings-menu__item" onClick={() => openScreen("profile")}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                👤 Hồ sơ học viên
                            </button>
                            <button className="settings-menu__item" onClick={() => openScreen("goals")}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                                🎯 Mục tiêu & Lộ trình
                            </button>
                            <div className="settings-menu__divider" />
                            <button className="settings-menu__item" onClick={() => setHienSettings(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                Cài đặt
                            </button>
                            <button className="settings-menu__item" onClick={() => { setHienSettings(false); window.open("https://learnify.com/help", "_blank"); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                Trợ giúp
                            </button>
                            <div className="settings-menu__divider" />
                            <button className="settings-menu__item" onClick={() => { setHienSettings(false); onDong(); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                🎓 Về Learnify
                            </button>
                        </div>
                    )}
                    <button
                        className="chat-sidebar__settings-btn"
                        onClick={() => setHienSettings(!hienSettings)}
                        title="Cài đặt và trợ giúp"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        Cài đặt và trợ giúp
                    </button>
                </div>
            </aside>

            {/* Backdrop khi sidebar mở */}
            {hienSidebar && <div className="chat-sidebar-backdrop" onClick={() => setHienSidebar(false)} />}

            {/* ===== MAIN CHAT AREA ===== */}
            <div className="chat-main">
                {/* TopBar */}
                <div className="chat-topbar">
                    <div className="chat-topbar__left">
                        {/* Nút lịch sử – chỉ hiện khi full màn */}
                        {fullScreen && (
                            <button
                                className="topbar-btn--menu"
                                onClick={() => setHienSidebar(!hienSidebar)}
                                title="Lịch sử chat"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20">
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                            </button>
                        )}
                        <h2 className="chat-topbar__title">{tieuDe}</h2>
                    </div>
                    <div className="chat-topbar__actions">
                        <span style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 500,
                            color: trangThai === "da_ket_noi" ? "var(--online)" : trangThai === "dang_ket_noi" ? "var(--connecting)" : "var(--offline)"
                        }}>
                            <span style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: "currentColor",
                                boxShadow: trangThai === "da_ket_noi" ? "0 0 6px var(--online)" : "none"
                            }}></span>
                            {trangThai === "da_ket_noi" ? "Đã kết nối" : trangThai === "dang_ket_noi" ? "Đang kết nối..." : "Mất kết nối"}
                        </span>
                        {/* Nút mở full màn */}
                        {onToggleFullScreen && (
                            <button
                                className="topbar-btn--fullscreen"
                                onClick={onToggleFullScreen}
                                title={fullScreen ? "Thu nhỏ" : "Mở toàn màn"}
                            >
                                {fullScreen ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
                                        <polyline points="4 14 10 14 10 20" />
                                        <polyline points="20 10 14 10 14 4" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                        <line x1="3" y1="21" x2="14" y2="10" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
                                        <polyline points="15 3 21 3 21 9" />
                                        <polyline points="9 21 3 21 3 15" />
                                        <line x1="21" y1="3" x2="14" y2="10" />
                                        <line x1="3" y1="21" x2="10" y2="14" />
                                    </svg>
                                )}
                            </button>
                        )}
                        <button className="topbar-btn--close" onClick={onDong} title="Đóng">✕</button>
                    </div>
                </div>

                {/* Context bar - hiện khóa đang xem */}
                {courseContext && (
                    <div style={{
                        padding: "6px 16px",
                        background: "rgba(124,111,224,0.08)",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "var(--primary)",
                    }}>
                        <span>📖 Đang xem: <strong>{courseContext.title}</strong> ({courseContext.progress}%)</span>
                        <button
                            onClick={() => setCourseContext(null)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "var(--text-muted)" }}
                        >✕</button>
                    </div>
                )}

                {activeScreen === "profile" ? (
                    <ProfileScreen onBack={() => setActiveScreen("chat")} />
                ) : activeScreen === "goals" ? (
                    <GoalsScreen onBack={() => setActiveScreen("chat")} userId={userId} />
                ) : (
                <>
                    {/* Phase 2: Nudge Banner */}
                    {nudge && !nudgeDismissed && (
                        <div className="p2-nudge-banner">
                            <span className="p2-nudge-banner__msg" dangerouslySetInnerHTML={{ __html: nudge.message.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                            <div className="p2-nudge-banner__actions">
                                <button className="p2-nudge-banner__btn" onClick={() => { xuLyGuiTinNhan("Tôi muốn tiếp tục học hôm nay!"); setNudgeDismissed(true); }}>▶ Học ngay</button>
                                <button className="p2-nudge-banner__dismiss" onClick={() => setNudgeDismissed(true)}>✕</button>
                            </div>
                        </div>
                    )}
                    {/* Feature D: Study Schedule Check-in Banner — always visible */}
                    {showCheckin && !checkinDismissed && (
                        <div style={{
                            background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                            color: "#fff", padding: "8px 14px",
                            display: "flex", alignItems: "center", gap: 10, fontSize: 13,
                            flexShrink: 0
                        }}>
                            <span>📚 Đến giờ học rồi!</span>
                            <button onClick={() => { setCheckinDismissed(true); xuLyGuiTinNhan("Tôi đang bắt đầu học, hãy gợi ý cho tôi bài học tiếp theo."); }}
                                style={{ background: "#fff", color: "#7c3aed", border: "none", borderRadius: 8, padding: "3px 10px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                                ✅ Bắt đầu học
                            </button>
                            <button onClick={() => setCheckinDismissed(true)} style={{ background: "none", border: "none", color: "#fff", opacity: 0.7, cursor: "pointer" }}>✕</button>
                        </div>
                    )}

                    {/* Messages area + Greeting + Quick Actions */}
                    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
                        {danhSachTinNhan.length === 0 && !dangXuLy ? (
                            /* Welcome screen – Gemini style (no messages yet) */
                            <div className="gemini-welcome">
                                {/* Bot avatar & greeting text */}
                                <div className="gemini-welcome__hero">
                                    <div className="gemini-welcome__avatar-wrap">
                                        <BotAvatar size={72} />
                                        <div className="gemini-welcome__avatar-ring" />
                                    </div>
                                    {streak > 0 && (
                                        <div className="gemini-streak-badge">
                                            🔥 {streak} ngày liên tiếp
                                        </div>
                                    )}
                                    <div className="gemini-welcome__brand">Learnify Tutor AI</div>
                                    <div className="gemini-welcome__tagline">
                                        {greeting
                                            ? <span dangerouslySetInnerHTML={{ __html: greeting.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                                            : "Chào bạn! Tôi có thể giúp gì cho bạn hôm nay?"}
                                    </div>
                                </div>

                                {/* Suggestion chips – like Gemini */}
                                <div className="gemini-welcome__chips">
                                    {[
                                        { icon: "📊", label: "Xem tiến độ", msg: "Hãy cho tôi biết tiến độ học tập hiện tại của tôi?" },
                                        { icon: "🗺️", label: "Gợi ý hôm nay", msg: "Hôm nay tôi nên học gì dựa trên mục tiêu của mình?" },
                                        { icon: "📝", label: "Giải thích khái niệm", msg: "Giải thích một khái niệm quan trọng phù hợp với trình độ của tôi." },
                                        { icon: "💡", label: "Mẹo học hiệu quả", msg: "Chia sẻ 3 mẹo học tập hiệu quả phù hợp với mục tiêu của tôi!" },
                                        { icon: "🧠", label: "Làm quiz ngay", action: () => { setQuizContext({}); setShowQuiz(true); } },
                                        { icon: "✨", label: "Gợi ý khóa học", action: () => setShowRecs(true) },
                                    ].map(({ icon, label, msg, action }: any) => (
                                        <button
                                            key={label}
                                            className="gemini-chip"
                                            onClick={() => action ? action() : msg && xuLyGuiTinNhan(msg)}
                                        >
                                            <span className="gemini-chip__icon">{icon}</span>
                                            <span className="gemini-chip__label">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Chat messages area (when there are messages or typing) */
                            <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                {/* Notes Panel overlay */}
                                {showNotes ? (
                                    <NotesPanel
                                        userId={userId}
                                        onClose={() => setShowNotes(false)}
                                        onGoToChat={(sid) => { setShowNotes(false); chonHoiThoai(sid); }}
                                    />
                                ) : (
                                    <ChatMessageArea
                                        danhSachTinNhan={danhSachTinNhan}
                                        dangXuLy={dangXuLy}
                                        lastCompletedMsgId={lastCompletedMsgId}
                                        onFollowUpChip={xuLyGuiTinNhan}
                                        onOpenQuiz={(topic) => { setQuizContext({ topic }); setShowQuiz(true); }}
                                        onOpenNotes={() => setShowNotes(true)}
                                        userId={userId}
                                        sessionId={sessionId}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Phase 2: Session Summary Button */}
                    {danhSachTinNhan.length >= 10 && danhSachTinNhan.length % 2 === 0 && !dangXuLy && (
                        <div className="p2-session-summary">
                            <button className="p2-session-summary__btn" onClick={() => xuLyGuiTinNhan("Hãy tóm tắt phiên học vừa rồi của tôi: những gì đã ôn luyện, điểm mạnh và điểm cần cải thiện.")}>
                                📋 Tóm tắt phiên học
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    <ChatInputBar
                        onGuiTinNhan={xuLyGuiTinNhan}
                        dangXuLy={dangXuLy}
                        daKetNoi={trangThai === "da_ket_noi"}
                    />
                </>
                )}
            </div>

            {/* ===== Phase 3 Modals ===== */}
            {showQuiz && (
                <QuizModal
                    goalTitle={quizContext.goalTitle}
                    topic={quizContext.topic}
                    userId={userId}
                    onClose={() => setShowQuiz(false)}
                />
            )}
            {showRecs && (
                <div className="rec-panel-overlay" onClick={(e) => e.target === e.currentTarget && setShowRecs(false)}>
                    <RecommendationsPanel
                        userId="default"
                        onClose={() => setShowRecs(false)}
                        onStartChat={(msg) => { xuLyGuiTinNhan(msg); setShowRecs(false); }}
                    />
                </div>
            )}
        </div>
    );
}

function taoSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
