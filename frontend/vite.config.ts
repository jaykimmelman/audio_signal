import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` lets the same build work both locally and on GitHub Pages,
// regardless of repo name (asset URLs become relative to index.html).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
