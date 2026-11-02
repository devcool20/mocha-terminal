import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "inline-app-styles",
      transformIndexHtml: {
        order: "post",
        handler(html, context) {
          if (!context.bundle) return html;
          return html.replace(
            /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
            (tag, path) => {
              const asset = context.bundle![path.replace(/^\//, "")];
              return asset?.type === "asset"
                ? `<style>${asset.source}</style>`
                : tag;
            },
          );
        },
      },
    },
  ],
  server: { host: "127.0.0.1" },
});
