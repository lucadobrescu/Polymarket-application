import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { handleGetProfile } from "./handlers";

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
      app.get("/profile", handleGetProfile, {
        query: t.Object({
          activePage: t.Optional(t.Numeric()),
          resolvedPage: t.Optional(t.Numeric()),
        }),
      }),
  );