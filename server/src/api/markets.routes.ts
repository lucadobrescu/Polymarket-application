import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { apiKeyMiddleware } from "../middleware/apikey.middleware";
import {
  handleCreateMarket,
  handleListMarkets,
  handleGetMarket,
  handlePlaceBet,
  handleResolveMarket,
} from "./handlers";

// ─── Market Routes ────────────────────────────────────────────────────────────

export const marketRoutes = new Elysia({ prefix: "/api/markets" })
  .use(authMiddleware)
  .use(apiKeyMiddleware)

  // ─── Public Routes (no auth required) ──────────────────────────────────────

  .get("/", handleListMarkets, {
    query: t.Object({
      status: t.Optional(t.String()),
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric()),
      sortBy: t.Optional(t.String()),
      sortOrder: t.Optional(t.String()),
    }),
  })

  .get("/:id", handleGetMarket, {
    params: t.Object({
      id: t.Numeric(),
    }),
  })

  // ─── Protected Routes (JWT or API key required) ─────────────────────────────

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
        // ─── Create Market ────────────────────────────────────────────────
        .post("/", handleCreateMarket as any, {
          body: t.Object({
            title: t.String(),
            description: t.Optional(t.String()),
            outcomes: t.Array(t.String()),
          }),
        })

        // ─── Place Bet ────────────────────────────────────────────────────
        .post("/:id/bets", handlePlaceBet as any, {
          params: t.Object({
            id: t.Numeric(),
          }),
          body: t.Object({
            outcomeId: t.Number(),
            amount: t.Number(),
          }),
        })

        // ─── Resolve Market (admin only) ──────────────────────────────────
        .post("/:id/resolve", handleResolveMarket as any, {
          params: t.Object({
            id: t.Numeric(),
          }),
          body: t.Object({
            outcomeId: t.Number(),
          }),
        }),
  );