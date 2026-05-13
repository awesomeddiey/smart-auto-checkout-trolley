import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e0f9ff",
          100: "#b3f1ff",
          200: "#66e2ff",
          300: "#19d4ff",
          400: "#00c8f5",
          500: "#00b8e0",
          600: "#0099bb",
          700: "#007a96",
          800: "#005c71",
          900: "#003d4c",
        },
        glass: {
          white: "rgba(255,255,255,0.07)",
          border: "rgba(255,255,255,0.12)",
          hover: "rgba(255,255,255,0.12)",
        },
      },
      backgroundImage: {
        "trolley-gradient": "linear-gradient(135deg, #0a0e1a 0%, #0d1424 50%, #111827 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
        "accent-gradient": "linear-gradient(135deg, #00d4ff 0%, #6366f1 100%)",
        "success-gradient": "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        "danger-gradient": "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
        "warning-gradient": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      },
      backdropBlur: {
        glass: "12px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "pulse-slow":   "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line":    "scanLine 2s ease-in-out infinite",
        "float":        "float 3s ease-in-out infinite",
        "shimmer":      "shimmer 2s linear infinite",
        "glow":         "glow 2s ease-in-out infinite alternate",
        "slide-up":     "slideUp 0.4s ease-out",
        "slide-in":     "slideIn 0.3s ease-out",
        "bounce-in":    "bounceIn 0.5s cubic-bezier(0.68,-0.55,0.265,1.55)",
      },
      keyframes: {
        scanLine: {
          "0%, 100%": { transform: "translateY(0%)", opacity: "1" },
          "50%": { transform: "translateY(100%)", opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0,212,255,0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(0,212,255,0.8), 0 0 40px rgba(0,212,255,0.3)" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      boxShadow: {
        glass:   "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        glow:    "0 0 15px rgba(0, 212, 255, 0.5)",
        "glow-success": "0 0 15px rgba(16, 185, 129, 0.5)",
        "glow-danger":  "0 0 15px rgba(244, 63, 94, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
