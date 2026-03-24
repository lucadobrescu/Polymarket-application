
import { Elysia, t } from "elysia";
import { jwtPlugin } from "../plugins/jwt";
import { handleRegister, handleLogin, handleGetSecurityQuestion, handleResetPassword, handleForgotPassword, handleResetPasswordWithToken, handleVerifyEmail } from "./handlers";

// ─── Auth Routes ──────────────────────────────────────────────────────────────

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(jwtPlugin)

  // ─── Register ─────────────────────────────────────────────────────────────
  .post("/register", handleRegister, {
    body: t.Object({
      username: t.String(),
      email: t.String(),
      password: t.String(),
      securityQuestion: t.String(),
      securityAnswer: t.String(),
    }),
  })

  // ─── Login ────────────────────────────────────────────────────────────────
  .post("/login", handleLogin, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })

  // ─── Get Security Question ────────────────────────────────────────────────
  .get("/security-question/:email", handleGetSecurityQuestion, {
  params: t.Object({
    email: t.String(),
  }),
})


  // ─── Reset Password ───────────────────────────────────────────────────────
  .post("/reset-password", handleResetPassword, {
  body: t.Object({
    email: t.String(),
    securityAnswer: t.String(),
    newPassword: t.String(),
  }),
})

// ─── Forgot Password Email ────────────────────────────────────────────────────
.post("/forgot-password-email", handleForgotPassword, {
  body: t.Object({
    email: t.String(),
  }),
})

// ─── Reset Password With Token ────────────────────────────────────────────────
.post("/reset-password-token", handleResetPasswordWithToken, {
  body: t.Object({
    token: t.String(),
    newPassword: t.String(),
  }),
})

.get("/verify-email", handleVerifyEmail as any, {
  query: t.Object({
    token: t.String(),
  }),
})