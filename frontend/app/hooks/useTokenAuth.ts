"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const APP_TOKEN = process.env.NEXT_PUBLIC_APP_TOKEN || "learnify_secret_2025";
const SESSION_KEY = "learnify_userId";

/**
 * Hook xác thực qua URL token:
 * - ?token=SECRET&user=cuong → lưu userId vào sessionStorage
 * - Nếu không có token nhưng sessionStorage có → dùng tiếp
 * - Nếu không có gì → userId = "guest"
 */
export function useTokenAuth() {
    const searchParams = useSearchParams();
    const [userId, setUserId] = useState<string>("guest");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = searchParams.get("token");
        const user = searchParams.get("user");

        if (token === APP_TOKEN && user) {
            // Token hợp lệ từ URL → lưu vào sessionStorage
            sessionStorage.setItem(SESSION_KEY, user);
            setUserId(user);
        } else {
            // Kiểm tra sessionStorage (user đã auth trước đó trong tab này)
            const saved = sessionStorage.getItem(SESSION_KEY);
            setUserId(saved || "guest");
        }
        setReady(true);
    }, [searchParams]);

    return { userId, ready };
}
