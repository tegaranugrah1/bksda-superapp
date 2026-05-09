import type { NextConfig } from "next";

const nextConfig: NextConfig = {

    compiler: {
        removeConsole: process.env.NODE_ENV === "production",
    },

    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
                ignored: ['**/node_modules', '**/.git', '**/.next', '**/backend/**'],
            };
        }
        return config;
    },

    turbopack: {},

    async rewrites() {
        return [
            {
                source: "/storage/:path*",
                destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend.vercel.app'}/storage/:path*`,
            },
        ];
    },

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
        ];
    },

    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/assets/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/storage/**',
            },
            {
                protocol: 'https',
                hostname: 'bksdakaltim.ksdae.kehutanan.go.id',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'iflvjdalryfosgbxvcon.supabase.co',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/**',
            },
        ],
    },
};

export default nextConfig;
