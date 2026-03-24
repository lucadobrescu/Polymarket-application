import { Elysia } from "elysia";
import { getUserById } from "../lib/auth";
import db from "../db";
import { apiKeysTable, usersTable } from "../db/schema";
import { eq } from "drizzle-orm";

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .derive(async ({ headers, jwt }: any) => {

    // ─── Try JWT first ───────────────────────────────────────────────────────
    const authHeader = headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await jwt.verify(token);
      if (payload) {
        const user = await getUserById(payload.userId);
        if (user) return { user };
      }
    }

    // ─── Try API key ─────────────────────────────────────────────────────────
    const rawKey = headers["x-api-key"];
    if (rawKey) {
      const encoder = new TextEncoder();
      const data = encoder.encode(rawKey);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const apiKey = await (db.query as any).apiKeysTable.findFirst({
        where: eq(apiKeysTable.keyHash, keyHash),
      });

      if (apiKey) {
        const user = await (db.query as any).usersTable.findFirst({
          where: eq(usersTable.id, apiKey.userId),
        });
        if (user) return { user };
      }
    }

    // ─── No auth found ───────────────────────────────────────────────────────
    return { user: null };
  })
  .as("scoped");