// Preview the actual Nitro production build, bound to this computer by default.
process.env.NITRO_HOST ??= "127.0.0.1";
process.env.NITRO_PORT ??= "8081";
process.env.NODE_ENV = "production";
await import("../.output/server/index.mjs");
