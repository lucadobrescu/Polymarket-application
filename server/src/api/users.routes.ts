import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { handleGetProfile, handleGenerateApiKey, handleGetApiKey } from "./handlers";

// ─── User Routes ──────────────────────────────────────────────────────────────

export const userRoutes = new Elysia({ prefix: "/api/users" })
  .use(authMiddleware)
  .guard(
    {
      beforeHandle({ user, set }: any) {
        if (!user) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
      },
    },
    (app) =>
      app
        // ─── Profile ───────────────────────────────────────────────────────
        .get("/profile", handleGetProfile as any, {
          query: t.Object({
            activePage: t.Optional(t.Numeric()),
            resolvedPage: t.Optional(t.Numeric()),
          }),
        })

        // ─── API Keys ──────────────────────────────────────────────────────
        .get("/api-key", handleGetApiKey as any)
        .post("/api-key/generate", handleGenerateApiKey as any),
  );