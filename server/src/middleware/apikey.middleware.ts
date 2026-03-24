import { Elysia } from "elysia";
import db from "../db";
import { apiKeysTable, usersTable } from "../db/schema";
import { eq } from "drizzle-orm";

// ─── API Key Middleware ───────────────────────────────────────────────────────

export const apiKeyMiddleware = new Elysia({ name: "apiKeyMiddleware" })
  .derive(async ({ headers, user: existingUser }: any) => {
    // If JWT middleware already found a user — don't overwrite
    if (existingUser) return {};

    const rawKey = headers["x-api-key"];
    if (!rawKey) return {};

    // Hash the incoming key with SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Look up the hash in the database
    const apiKey = await (db.query as any).apiKeysTable.findFirst({
      where: eq(apiKeysTable.keyHash, keyHash),
    });

    if (!apiKey) return {};

    // Find the user this key belongs to
    const user = await (db.query as any).usersTable.findFirst({
      where: eq(usersTable.id, apiKey.userId),
    });

    if (!user) return {};

    return { user };
  });