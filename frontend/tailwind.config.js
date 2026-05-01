/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surveillance / CIA dark palette
        ink:    "#05080d",
        panel:  "#0b1220",
        panel2: "#111a2e",
        line:   "#1f2a44",
        muted:  "#7a8aa6",
        text:   "#d6e1f2",
        accent: "#19c37d",  // signal green
        alert:  "#ef4444",  // hit red
        warn:   "#f5a524",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
