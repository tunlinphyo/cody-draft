import { defineConfig } from "vite-plus";
import { markdownPagesPlugin } from "./markdown/pages.ts";

export default defineConfig({
  server: {
    host: true,
    port: 1234,
  },
  plugins: [markdownPagesPlugin()],
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      "dist/**",
      "**/*/index.html",
      "public/notebook-view/**",
      "src/elements/ThemedIframe.vue",
    ],
  },
  lint: {
    ignorePatterns: ["public/notebook-view/**"],
    options: { typeAware: true, typeCheck: true },
  },
});
