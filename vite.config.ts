import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    host: "127.0.0.1",
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("src/data/pricing.json")) {
            return "pricing-data";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "recharts";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/lucide-react")) {
            return "vendor";
          }
        },
      },
    },
  },
});
