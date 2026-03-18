"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const auth = localStorage.getItem("learnify_auth");
        if (!auth) {
            router.replace("/login");
        } else {
            setChecked(true);
        }
    }, [router]);

    if (!checked) return null;
    return <>{children}</>;
}
