import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { handleCreateMarket, handleListMarkets, handleGetMarket, handlePlaceBet } from "./handlers";

export const marketRoutes = new Elysia({ prefix: "/api/markets" })
  .use(authMiddleware)
  .get("/", handleListMarkets, {
    query: t.Object({
      status: t.Optional(t.String()),
      page: t.Optional(t.Numeric()),      // Pentru paginare (ex: pagina 1)
      limit: t.Optional(t.Numeric()),     // Câte pe pagină (ex: 20)
      sortBy: t.Optional(t.String()),     // După ce sortăm (ex: date, totalBets)
      sortOrder: t.Optional(t.String()),  // Crescător (asc) sau descrescător (desc)
    }),
  })
  .get("/:id", handleGetMarket, {
    params: t.Object({
      id: t.Numeric(),
    }),
  })
  .guard(
    {
      beforeHandle({ user, set }) {
        if (!user) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
      },
    },
    (app) =>
      app
        .post("/", handleCreateMarket, {
          body: t.Object({
            title: t.String(),
            description: t.Optional(t.String()),
            outcomes: t.Array(t.String()),
          }),
        })
        .post("/:id/bets", handlePlaceBet, {
          params: t.Object({
            id: t.Numeric(),
          }),
          body: t.Object({
            outcomeId: t.Number(),
            amount: t.Number(),
          }),
        }),
  );
