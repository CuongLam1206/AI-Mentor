/**
 * Learnify Tutor AI – Kiểu dữ liệu cho Chat
 */

// === Tin nhắn ===
export interface TinNhan {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    trangThai: "dang_gui" | "da_gui" | "dang_stream" | "hoan_thanh" | "loi";
}

// === Hội thoại ===
export interface HoiThoai {
    id: string;
    session_id: string;
    title: string;
    last_message: string;
    updated_at: string;
    starred?: boolean;
}

// === Tin nhắn WebSocket ===
export type LoaiTinNhanWS =
    | "message"
    | "stream_start"
    | "stream_chunk"
    | "stream_end"
    | "error"
    | "suggestions"
    | "typing";

export interface TinNhanWS {
    type: LoaiTinNhanWS;
    content?: string;
    message_id?: string;
    items?: { label: string; action: string }[];
}

// === Trạng thái kết nối ===
export type TrangThaiKetNoi = "dang_ket_noi" | "da_ket_noi" | "mat_ket_noi";

// === Trạng thái Panel ===
export type CheDo = "thu_gon" | "mo_rong";
