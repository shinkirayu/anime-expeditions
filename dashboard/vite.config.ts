import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // amazon-cognito-identity-js pulls in the `buffer` polyfill package, which
  // references the bare Node global `global` (e.g. `global.TYPED_ARRAY_SUPPORT`)
  // — undefined in a browser context. Rewriting the identifier to `globalThis`
  // at build time is enough; nothing else in that dependency chain touches
  // Node-only globals (isomorphic-unfetch resolves its `browser` entry, which
  // uses `self.fetch` instead).
  define: {
    global: "globalThis",
  },
  // The plain `define` above only rewrites app/library source as Rollup
  // processes it — dev-mode dependency pre-bundling runs through a separate
  // esbuild pass that needs the same substitution told to it directly.
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    target: "es2020",
    // Split the heavy vendor deps out of the route bundles so account pages
    // lazy-load quickly and vendor chunks cache long-term.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
});
