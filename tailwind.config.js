/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        fh: {
          bg: "#0a0e1a",
          card: "#0d1529",
          border: "#1e3a5f",
          accent: "#5eead4",
          secondary: "#0d9488",
          muted: "#94a3b8",
          dim: "#475569",
        },
      },
    },
  },
  plugins: [],
};
