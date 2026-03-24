import {
  sqliteTable,
  text,
  real,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersTable = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    balance: real("balance").notNull().default(1000),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    securityQuestion: text("security_question"),
    securityAnswerHash: text("security_answer_hash"),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false),    
    verificationToken: text("verification_token"),
    resetToken: text("reset_token"),
    resetTokenExpiry: integer("reset_token_expiry"),  },
  (table) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(table.username),
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

// ─── Markets ──────────────────────────────────────────────────────────────────

export const marketsTable = sqliteTable(
  "markets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["active", "resolved"] })
      .notNull()
      .default("active"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usersTable.id),
    resolvedOutcomeId: integer("resolved_outcome_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    createdByIdx: index("markets_created_by_idx").on(table.createdBy),
    statusIdx: index("markets_status_idx").on(table.status),
  }),
);

// ─── Market Outcomes ──────────────────────────────────────────────────────────

export const marketOutcomesTable = sqliteTable(
  "market_outcomes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    marketId: integer("market_id")
      .notNull()
      .references(() => marketsTable.id),
    title: text("title").notNull(),
    position: integer("position").notNull(),
  },
  (table) => ({
    marketIdIdx: index("market_outcomes_market_id_idx").on(table.marketId),
  }),
);

// ─── Bets ─────────────────────────────────────────────────────────────────────

export const betsTable = sqliteTable(
  "bets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id),
    marketId: integer("market_id")
      .notNull()
      .references(() => marketsTable.id),
    outcomeId: integer("outcome_id")
      .notNull()
      .references(() => marketOutcomesTable.id),
    amount: real("amount").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("bets_user_id_idx").on(table.userId),
    marketIdIdx: index("bets_market_id_idx").on(table.marketId),
    outcomeIdIdx: index("bets_outcome_id_idx").on(table.outcomeId),
  }),
);

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeysTable = sqliteTable(
  "api_keys",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id),
    keyHash: text("key_hash").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("api_keys_user_id_idx").on(table.userId),
  }),
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(usersTable, ({ many }) => ({
  createdMarkets: many(marketsTable, { relationName: "createdBy" }),
  bets: many(betsTable, { relationName: "bets" }),
  apiKeys: many(apiKeysTable, { relationName: "apiKeys" }),
}));

export const marketsRelations = relations(marketsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [marketsTable.createdBy],
    references: [usersTable.id],
    relationName: "createdBy",
  }),
  outcomes: many(marketOutcomesTable, { relationName: "outcomes" }),
  bets: many(betsTable, { relationName: "bets" }),
  resolvedOutcome: one(marketOutcomesTable, {
    fields: [marketsTable.resolvedOutcomeId],
    references: [marketOutcomesTable.id],
  }),
}));

export const marketOutcomesRelations = relations(
  marketOutcomesTable,
  ({ one, many }) => ({
    market: one(marketsTable, {
      fields: [marketOutcomesTable.marketId],
      references: [marketsTable.id],
      relationName: "outcomes",
    }),
    bets: many(betsTable, { relationName: "bets" }),
  }),
);

export const betsRelations = relations(betsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [betsTable.userId],
    references: [usersTable.id],
    relationName: "bets",
  }),
  market: one(marketsTable, {
    fields: [betsTable.marketId],
    references: [marketsTable.id],
    relationName: "bets",
  }),
  outcome: one(marketOutcomesTable, {
    fields: [betsTable.outcomeId],
    references: [marketOutcomesTable.id],
    relationName: "bets",
  }),
}));

export const apiKeysRelations = relations(apiKeysTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [apiKeysTable.userId],
    references: [usersTable.id],
    relationName: "apiKeys",
  }),
}));