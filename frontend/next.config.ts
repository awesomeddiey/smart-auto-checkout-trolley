import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  env: {
    NEXT_PUBLIC_API_URL:          process.env.NEXT_PUBLIC_API_URL          || "http://localhost:8000",
    NEXT_PUBLIC_WS_URL:           process.env.NEXT_PUBLIC_WS_URL           || "ws://localhost:8000",
    NEXT_PUBLIC_SUPABASE_URL:     process.env.NEXT_PUBLIC_SUPABASE_URL     || "https://swquhttelocebzafafje.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cXVodHRlbG9jZWJ6YWZhZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzU3OTcsImV4cCI6MjA5NTE1MTc5N30.VmF5O-YcCwSBwRRCzYpVpioTgubjxBYXacN9oOszslc",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "localhost" },
    ],
  },
};

export default nextConfig;
