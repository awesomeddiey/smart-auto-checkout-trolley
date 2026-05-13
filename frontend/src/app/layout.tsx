import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Smart Checkout Trolley",
  description: "AI-powered retail self-checkout — scan, verify, pay.",
  manifest:    "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SmartTrolley" },
};

export const viewport: Viewport = {
  width:            "device-width",
  initialScale:     1,
  themeColor:       "#00d4ff",
  userScalable:     false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Prevent theme flash on load */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();` }} />
      </head>
      <body className="h-full bg-trolley-gradient antialiased">
        {children}
      </body>
    </html>
  );
}
