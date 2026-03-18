/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    // Cho phép nhúng vào iframe từ bất kỳ domain nào
                    // Đổi thành domain Learnify cụ thể nếu muốn giới hạn
                    {
                        key: "X-Frame-Options",
                        value: "ALLOWALL",
                    },
                    {
                        key: "Content-Security-Policy",
                        value: "frame-ancestors *;",
                    },
                ],
            },
        ];
    },
};
module.exports = nextConfig;
