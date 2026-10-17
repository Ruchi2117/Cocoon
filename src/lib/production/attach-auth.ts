import { createMiddleware } from "@tanstack/react-start";
import { bearerHeaders } from "./auth";
export const attachProductionAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => next({ headers: await bearerHeaders() }),
);

