/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        fh: {
          bg: "#0a0a0a",
          "bg-alt": "#111111",
          card: "#1a1a1a",
          border: "#2a2a2a",
          red: "#cc1111",
          "red-bright": "#ff2222",
          muted: "#999999",
          dim: "#555555",
          success: "#22cc44",
          warning: "#ffaa00",
        },
      },
      fontFamily: {
        mono: ['"DM Mono"', "JetBrains Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
