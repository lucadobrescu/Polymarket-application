import { describe, it, expect, beforeAll } from "bun:test";
import { eq } from "drizzle-orm";
import { app } from "../index";
import db from "../src/db";
import { usersTable } from "../src/db/schema";

const BASE = "http://localhost";

let userToken = "";
let userId = 0;
let adminToken = "";
let marketId = 0;
let outcomeId = 0;

const USER = {
  username: "testuser",
  email: "test@example.com",
  password: "testpass123",
  securityQuestion: "Favorite color?",
  securityAnswer: "blue",
};

const ADMIN = {
  username: "adminuser",
  email: "admin@example.com",
  password: "adminpass123",
  securityQuestion: "Pet name?",
  securityAnswer: "milo",
};

beforeAll(async () => {
  const sqlite = (db as any).$client;
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      balance REAL NOT NULL DEFAULT 1000,
      role TEXT NOT NULL DEFAULT 'user',
      security_question TEXT,
      security_answer_hash TEXT,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_token_expiry INTEGER
    );

    CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);

    CREATE TABLE IF NOT EXISTS markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_by INTEGER NOT NULL,
      resolved_outcome_id INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS markets_created_by_idx ON markets(created_by);
    CREATE INDEX IF NOT EXISTS markets_status_idx ON markets(status);

    CREATE TABLE IF NOT EXISTS market_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (market_id) REFERENCES markets(id)
    );

    CREATE INDEX IF NOT EXISTS market_outcomes_market_id_idx ON market_outcomes(market_id);

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      market_id INTEGER NOT NULL,
      outcome_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (market_id) REFERENCES markets(id),
      FOREIGN KEY (outcome_id) REFERENCES market_outcomes(id)
    );

    CREATE INDEX IF NOT EXISTS bets_user_id_idx ON bets(user_id);
    CREATE INDEX IF NOT EXISTS bets_market_id_idx ON bets(market_id);
    CREATE INDEX IF NOT EXISTS bets_outcome_id_idx ON bets(outcome_id);

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
  `);
});

describe("Auth + Email Verification", () => {
  it("POST /api/auth/register creates a user and verification token", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(USER),
      }),
    );

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(String(data.message).toLowerCase()).toContain("verify");

    const user = await (db.query as any).usersTable.findFirst({
      where: eq(usersTable.email, USER.email),
    });

    expect(user).toBeDefined();
    expect(user.verificationToken).toBeDefined();
    expect(String(user.verificationToken).length).toBeGreaterThanOrEqual(64);
  });

  it("POST /api/auth/login blocks unverified users", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: USER.email, password: USER.password }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("GET /api/auth/verify-email verifies account", async () => {
    const user = await (db.query as any).usersTable.findFirst({
      where: eq(usersTable.email, USER.email),
    });

    const res = await app.handle(
      new Request(`${BASE}/api/auth/verify-email?token=${user.verificationToken}`),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
  });

  it("POST /api/auth/login succeeds after verification", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: USER.email, password: USER.password }),
      }),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.token).toBeDefined();
    expect(data.role).toBe("user");

    userToken = data.token;
    userId = data.id;
  });

  it("POST /api/auth/forgot-password-email + reset-password-token updates password", async () => {
    const forgotRes = await app.handle(
      new Request(`${BASE}/api/auth/forgot-password-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: USER.email }),
      }),
    );

    expect(forgotRes.status).toBe(200);

    const user = await (db.query as any).usersTable.findFirst({
      where: eq(usersTable.email, USER.email),
    });

    expect(user.resetToken).toBeDefined();

    const resetRes = await app.handle(
      new Request(`${BASE}/api/auth/reset-password-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: user.resetToken, newPassword: "newpass123" }),
      }),
    );

    expect(resetRes.status).toBe(200);

    const loginRes = await app.handle(
      new Request(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: USER.email, password: "newpass123" }),
      }),
    );

    expect(loginRes.status).toBe(200);
    const loginData = (await loginRes.json()) as any;
    userToken = loginData.token;
  });
});

describe("User API Key Endpoints", () => {
  it("GET /api/users/api-key requires auth", async () => {
    const res = await app.handle(new Request(`${BASE}/api/users/api-key`));
    expect(res.status).toBe(401);
  });

  it("GET /api/users/api-key returns false before generation", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/users/api-key`, {
        headers: { Authorization: `Bearer ${userToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.hasApiKey).toBe(false);
  });

  it("POST /api/users/api-key/generate creates an API key", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/users/api-key/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${userToken}` },
      }),
    );

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.apiKey).toMatch(/^sk_/);
  });

  it("GET /api/users/api-key returns true after generation", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/users/api-key`, {
        headers: { Authorization: `Bearer ${userToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.hasApiKey).toBe(true);
  });
});

describe("Markets, Bets, and Admin Rules", () => {
  it("POST /api/markets creates a market as regular user", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/markets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          title: "Will Bun stay fast in 2026?",
          description: "Performance trend market",
          outcomes: ["Yes", "No"],
        }),
      }),
    );

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    marketId = data.id;
    outcomeId = data.outcomes[0].id;
  });

  it("POST /api/markets/:id/bets allows regular user bets", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/markets/${marketId}/bets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ outcomeId, amount: 25 }),
      }),
    );

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.userId).toBe(userId);
  });

  it("creates and verifies an admin user", async () => {
    const registerRes = await app.handle(
      new Request(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ADMIN),
      }),
    );

    expect(registerRes.status).toBe(201);

    const adminRecord = await (db.query as any).usersTable.findFirst({
      where: eq(usersTable.email, ADMIN.email),
    });

    await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.id, adminRecord.id));

    const verifyRes = await app.handle(
      new Request(`${BASE}/api/auth/verify-email?token=${adminRecord.verificationToken}`),
    );

    expect(verifyRes.status).toBe(200);

    const loginRes = await app.handle(
      new Request(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password }),
      }),
    );

    expect(loginRes.status).toBe(200);
    const loginData = (await loginRes.json()) as any;
    expect(loginData.role).toBe("admin");
    adminToken = loginData.token;
  });

  it("POST /api/markets/:id/bets blocks admin users", async () => {
    const res = await app.handle(
      new Request(`${BASE}/api/markets/${marketId}/bets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ outcomeId, amount: 10 }),
      }),
    );

    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Admins cannot place bets");
  });

  it("POST /api/markets/:id/resolve blocks non-admin and allows admin", async () => {
    const forbidden = await app.handle(
      new Request(`${BASE}/api/markets/${marketId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ outcomeId }),
      }),
    );

    expect(forbidden.status).toBe(403);

    const allowed = await app.handle(
      new Request(`${BASE}/api/markets/${marketId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ outcomeId }),
      }),
    );

    expect(allowed.status).toBe(200);
    const data = (await allowed.json()) as any;
    expect(data.success).toBe(true);
  });
});

describe("Error handling", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const res = await app.handle(new Request(`${BASE}/nonexistent`));

    expect(res.status).toBe(404);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Not found");
  });
});
