"use client";

/**
 * Learnify Tutor AI – Bot Avatar Component
 * Dùng ảnh 3D do anh tạo từ ChatGPT.
 * Ảnh đặt tại: public/ChatGPT Image 12_59_49 10 thg 3, 2026.png
 */

interface Props {
    size?: number;
    className?: string;
}

// Ảnh bot mới – nền trắng, phong cách sáng
const BOT_IMAGE_URL = "/learnify-bot.png.png";

export default function BotAvatar({ size = 120, className = "" }: Props) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={BOT_IMAGE_URL}
            alt="Learnify AI Tutor"
            width={size}
            height={size}
            className={className}
            style={{
                width: size,
                height: size,
                objectFit: "contain",
                display: "block",
            }}
        />
    );
}
