import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // GitHub-inspired palette
        gh: {
          blue:        "#0969DA",
          "blue-dark": "#0A3069",
          "blue-dim":  "#388BFD",
          canvas:      "#FFFFFF",
          "canvas-subtle": "#F6F8FA",
          "canvas-inset":  "#F0F2F5",
          border:      "#D0D7DE",
          "border-muted": "#D8DEE4",
          fg:          "#1F2328",
          "fg-muted":  "#656D76",
          "fg-subtle": "#8C959F",
          success:     "#1A7F37",
          "success-emphasis": "#2DA44E",
          danger:      "#CF222E",
          accent:      "#0A66C2",
        },
        // Dark mode equivalents
        dark: {
          canvas:      "#0D1117",
          "canvas-subtle": "#161B22",
          "canvas-inset":  "#010409",
          border:      "#30363D",
          "border-muted": "#21262D",
          fg:          "#E6EDF3",
          "fg-muted":  "#848D97",
          "fg-subtle": "#6E7681",
          blue:        "#388BFD",
          success:     "#3FB950",
          danger:      "#F85149",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          '"Noto Sans"',
          "Helvetica",
          "Arial",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
        mono: [
          '"SFMono-Regular"',
          "Consolas",
          '"Liberation Mono"',
          "Menlo",
          "Courier",
          "monospace",
        ],
      },
      fontSize: {
        xs:   ["12px", { lineHeight: "18px" }],
        sm:   ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg:   ["18px", { lineHeight: "28px" }],
        xl:   ["20px", { lineHeight: "30px" }],
        "2xl":["24px", { lineHeight: "32px" }],
        "3xl":["30px", { lineHeight: "38px" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        md:      "6px",
        lg:      "8px",
        xl:      "12px",
      },
      boxShadow: {
        card:       "0 1px 0 rgba(31,35,40,0.04), 0 0 0 1px rgba(31,35,40,0.04)",
        "card-dark":"0 1px 0 rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.4)",
        overlay:    "0 8px 24px rgba(140,149,159,0.2)",
        "overlay-dark":"0 8px 24px rgba(1,4,9,0.8)",
        btn:        "0 1px 0 rgba(31,35,40,0.1), inset 0 1px 0 rgba(255,255,255,0.03)",
      },
      animation: {
        "fade-in":  "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pulse-once":"pulseOnce 0.6s ease-out",
        shimmer:    "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn:   { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:  { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulseOnce:{ "0%,100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        shimmer:  { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};

export default config;
