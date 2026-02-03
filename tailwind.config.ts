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
        // Terminal colors - ORANGE theme
        terminal: {
          orange: "#ff6b00",      // Primary orange
          yellow: "#ffaa00",      // Bright yellow-orange
          red: "#ff3333",         // Error red
          cyan: "#00d4ff",        // Accent cyan
          pink: "#ff6ec7",        // Accent pink
          purple: "#bf5fff",      // Accent purple
          green: "#00ff41",       // Success green
        },
        // Dark backgrounds - deep black for CRT effect
        surface: {
          base: "#0a0805",
          elevated: "#12100a",
          overlay: "#1a1610",
        },
        // Primary is now terminal orange
        primary: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#ff6b00",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        // Status colors - orange theme
        success: "#00ff41",
        warning: "#ffaa00",
        error: "#ff3333",
        info: "#00d4ff",
        // Reputation tiers - orange-based palette
        tier: {
          untrusted: "#666666",
          newcomer: "#ff6b00",
          reliable: "#00d4ff",
          trusted: "#bf5fff",
          elite: "#ff6ec7",
          legendary: "#ffaa00",
        },
      },
      fontFamily: {
        terminal: ["var(--font-terminal)", "VT323", "monospace"],
        pixel: ["var(--font-pixel)", "Press Start 2P", "monospace"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "0px",
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "blink": "blink 1s infinite",
        "typing": "typing 3s steps(40, end)",
        "glitch": "glitch 0.3s ease infinite",
        "scanline": "scanlines 0.1s linear infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px #ff6b00" },
          "50%": { boxShadow: "0 0 25px #ff6b00, 0 0 40px #ff6b00" },
        },
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        typing: {
          from: { width: "0" },
          to: { width: "100%" },
        },
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
        scanlines: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 4px" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      boxShadow: {
        "neon-orange": "0 0 20px #ff6b00, 0 0 40px #ff6b00",
        "neon-yellow": "0 0 20px #ffaa00, 0 0 40px #ffaa00",
        "neon-cyan": "0 0 20px #00d4ff, 0 0 40px #00d4ff",
        "neon-pink": "0 0 20px #ff6ec7, 0 0 40px #ff6ec7",
        "neon-purple": "0 0 20px #bf5fff, 0 0 40px #bf5fff",
        "neon-green": "0 0 20px #00ff41, 0 0 40px #00ff41",
      },
      dropShadow: {
        "neon-orange": "0 0 10px #ff6b00",
        "neon-yellow": "0 0 10px #ffaa00",
        "neon-cyan": "0 0 10px #00d4ff",
      },
    },
  },
  plugins: [],
};

export default config;
