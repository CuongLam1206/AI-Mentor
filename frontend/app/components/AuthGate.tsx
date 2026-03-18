"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        // Không check auth trên trang login
        if (PUBLIC_PATHS.includes(pathname)) {
            setChecked(true);
            return;
        }
        const auth = localStorage.getItem("learnify_auth");
        if (!auth) {
            router.replace("/login");
        } else {
            setChecked(true);
        }
    }, [router, pathname]);

    if (!checked) return null;
    return <>{children}</>;
}
