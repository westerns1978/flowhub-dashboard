/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fh: {
          /* Dark mode values (defaults, overridden by CSS vars) */
          bg: "var(--fh-bg)",
          "bg-alt": "var(--fh-bg-alt)",
          card: "var(--fh-card)",
          border: "var(--fh-border)",
          red: "#cc1111",
          "red-bright": "#ff2222",
          text: "var(--fh-text)",
          muted: "var(--fh-muted)",
          dim: "var(--fh-dim)",
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
