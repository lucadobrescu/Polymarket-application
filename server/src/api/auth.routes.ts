import { Elysia, t } from "elysia";
import { jwtPlugin } from "../plugins/jwt";
import { handleRegister, handleLogin } from "./handlers";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(jwtPlugin)
  .post("/register", handleRegister, {
    body: t.Object({
      username: t.String(),
      email: t.String(),
      password: t.String(),
    }),
  })
  .post("/login", handleLogin, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  });