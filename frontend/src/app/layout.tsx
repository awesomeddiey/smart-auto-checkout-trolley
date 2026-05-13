import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Smart Checkout Trolley",
  description: "AI-powered retail self-checkout — scan, verify, pay.",
  manifest:    "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SmartTrolley" },
};

export const viewport: Viewport = {
  width:           "device-width",
  initialScale:    1,
  themeColor:      "#00d4ff",
  userScalable:    false,
  viewportFit:     "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Prevent theme flash on load */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();` }} />
        {/* Register service worker for PWA */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');})}` }} />
      </head>
      <body className="h-full bg-trolley-gradient antialiased">
        {children}
      </body>
    </html>
  );
}
