"use client";

/**
 * Learnify Tutor AI – Hook quản lý kết nối WebSocket
 * Tự động kết nối lại khi mất kết nối.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { TinNhan, TrangThaiKetNoi, TinNhanWS } from "@/app/types/chat";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export interface PageContext {
    page: string;
    course_id?: string;
    course_name?: string;
    progress?: number;
}

interface ThamSoWebSocket {
    sessionId: string;
    khiBatDauStream: (messageId: string) => void;
    khiNhanDoanStream: (messageId: string, chunk: string) => void;
    khiKetThucStream: (messageId: string, fullContent: string) => void;
    khiLoi: (error: string) => void;
}

export function useChatWebSocket({
    sessionId,
    khiBatDauStream,
    khiNhanDoanStream,
    khiKetThucStream,
    khiLoi,
}: ThamSoWebSocket) {
    const [trangThai, setTrangThai] = useState<TrangThaiKetNoi>("mat_ket_noi");
    const wsRef = useRef<WebSocket | null>(null);
    const soLanThuLai = useRef(0);
    const timerThuLai = useRef<NodeJS.Timeout | null>(null);

    // Kết nối WebSocket
    const ketNoi = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setTrangThai("dang_ket_noi");

        const ws = new WebSocket(`${WS_URL}/ws/chat/${sessionId}`);

        ws.onopen = () => {
            setTrangThai("da_ket_noi");
            soLanThuLai.current = 0;
            console.log("✅ WebSocket đã kết nối");
        };

        ws.onclose = () => {
            setTrangThai("mat_ket_noi");
            console.log("🔌 WebSocket mất kết nối");

            // Tự động kết nối lại (tối đa 5 lần, backoff exponential)
            if (soLanThuLai.current < 5) {
                const doiMs = Math.min(1000 * Math.pow(2, soLanThuLai.current), 16000);
                console.log(`🔄 Thử kết nối lại sau ${doiMs}ms...`);
                timerThuLai.current = setTimeout(() => {
                    soLanThuLai.current++;
                    ketNoi();
                }, doiMs);
            }
        };

        ws.onerror = () => {
            console.error("❌ Lỗi WebSocket");
        };

        ws.onmessage = (event) => {
            try {
                const data: TinNhanWS = JSON.parse(event.data);
                switch (data.type) {
                    case "stream_start":
                        khiBatDauStream(data.message_id || "");
                        break;
                    case "stream_chunk":
                        khiNhanDoanStream(data.message_id || "", data.content || "");
                        break;
                    case "stream_end":
                        khiKetThucStream(data.message_id || "", data.content || "");
                        break;
                    case "error":
                        khiLoi(data.content || "Đã xảy ra lỗi");
                        break;
                }
            } catch {
                console.error("Không thể parse tin nhắn WebSocket");
            }
        };

        wsRef.current = ws;
    }, [sessionId, khiBatDauStream, khiNhanDoanStream, khiKetThucStream, khiLoi]);

    /** Gửi tin nhắn thường kèm page context */
    const guiTinNhan = useCallback((noiDung: string, pageContext?: PageContext) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const payload: any = { type: "message", content: noiDung };
            if (pageContext) payload.page_context = pageContext;
            wsRef.current.send(JSON.stringify(payload));
            return true;
        }
        return false;
    }, []);

    /** Gửi yêu cầu proactive greeting khi mở chat mới */
    const guiGreeting = useCallback((pageContext?: PageContext) => {
        const tryGreet = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const payload: any = { type: "greet" };
                if (pageContext) payload.page_context = pageContext;
                wsRef.current.send(JSON.stringify(payload));
                return true;
            }
            return false;
        };
        if (!tryGreet()) {
            // WS chưa sẵn sàng — thử lại sau 600ms
            setTimeout(tryGreet, 600);
        }
    }, []);

    // Ngắt kết nối
    const ngatKetNoi = useCallback(() => {
        if (timerThuLai.current) clearTimeout(timerThuLai.current);
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    // Cleanup khi unmount
    useEffect(() => {
        return () => { ngatKetNoi(); };
    }, [ngatKetNoi]);

    return { trangThai, ketNoi, guiTinNhan, guiGreeting, ngatKetNoi };
}
