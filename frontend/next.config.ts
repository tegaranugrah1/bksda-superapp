import type { NextConfig } from "next";

const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: http: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' ws: wss: http: https: http://localhost:8000 http://127.0.0.1:8000 https://bksdakaltim.net https://www.bksdakaltim.net https://api.bksdakaltim.net https://storage.bksdakaltim.net https://*.supabase.co",
    "frame-src 'self' blob: data: https://www.youtube.com https://www.youtube-nocookie.com",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
    allowedDevOrigins: ["192.168.100.176", "127.0.0.1", "localhost"],

    output: "standalone",

    compiler: {
        removeConsole: process.env.NODE_ENV === "production",
    },

    experimental: {
        optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
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
        if (process.env.NODE_ENV === "development") {
            const backendUrl = "http://localhost:8000";
            return [
                {
                    source: "/api/:path*",
                    destination: `${backendUrl}/api/:path*`,
                },
                {
                    source: "/sanctum/:path*",
                    destination: `${backendUrl}/sanctum/:path*`,
                },
                {
                    source: "/storage/:path*",
                    destination: `${backendUrl}/storage/:path*`,
                },
            ];
        }
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
                        key: "X-Robots-Tag",
                        value: "noindex, nofollow, noarchive",
                    },
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
                    {
                        key: "Content-Security-Policy",
                        value: contentSecurityPolicy,
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
                hostname: 'bksdakaltim.net',
                pathname: '/storage/**',
            },
            {
                protocol: 'https',
                hostname: 'www.bksdakaltim.net',
                pathname: '/storage/**',
            },
            {
                protocol: 'https',
                hostname: 'storage.bksdakaltim.net',
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
