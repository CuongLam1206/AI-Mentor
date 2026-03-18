/**
 * Shared config — đọc từ env var, fallback về Render URL nếu chưa set.
 */
export const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://ai-mentor-iwkf.onrender.com";

export const WS_URL =
    process.env.NEXT_PUBLIC_WS_URL || "wss://ai-mentor-iwkf.onrender.com";
