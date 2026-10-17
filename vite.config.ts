// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import publicAuth from "./src/lib/production/public-auth-config.json";

export default defineConfig({
  vite: {
    // Public build-time constants only. Never map SUPABASE_* or service-role secrets.
    // Pin the canonical hosted browser origin, not a sandbox or preview proxy.
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicAuth.url),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicAuth.publishableKey),
    },
  },
  // Local Node build; the published Lovable copy uses the Cloudflare preset.
  nitro: { preset: "node-server" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
