import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/healthz": "http://127.0.0.1:3000",
      "/internal": "http://127.0.0.1:3000",
      "/auth": "http://127.0.0.1:3000",
      "/channels": {
        target: "http://127.0.0.1:3000",
        bypass(req) {
          const url = req.url ?? "";
          if (
            req.method === "GET" &&
            req.headers.accept?.includes("text/html") &&
            /^\/channels\/[^/]+\/blocked(?:$|\?)/.test(url)
          ) {
            return "/index.html";
          }
          return undefined;
        },
      },
      "/output": {
        target: "http://127.0.0.1:3000",
        ws: true,
      },
      "/sandbox-api": process.env.VOXWARD_SANDBOX_ORIGIN ?? "http://127.0.0.1:3100",
    },
  },
});
