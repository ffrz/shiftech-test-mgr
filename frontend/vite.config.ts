/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/app/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/services/**/*.ts", "src/helpers/**/*.ts", "src/hooks/**/*.ts", "src/components/**/*.tsx", "src/pages/**/*.tsx"],
      exclude: ["src/**/*.test.{ts,tsx}"],
    },
  },
});
