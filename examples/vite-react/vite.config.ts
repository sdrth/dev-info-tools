import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packageSrc = path.resolve(rootDir, "../../dev-info-overlay/src");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "dev-info-overlay/styles.css": path.join(packageSrc, "styles.css"),
      "dev-info-overlay": path.join(packageSrc, "index.ts")
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
