import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import db from "../db";
import { usersTable, marketsTable, marketOutcomesTable, betsTable, apiKeysTable } from "../db/schema";
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  type AuthTokenPayload,
} from "../lib/auth";
import {
  validateRegistration,
  validateLogin,
  validateMarketCreation,
  validateBet,
} from "../lib/validation";

type JwtSigner = {
  sign: (payload: AuthTokenPayload) => Promise<string>;
};

export async function handleRegister({
  body,
  jwt,
  set,
}: {
  body: { username: string; email: string; password: string; securityQuestion: string; securityAnswer: string };
  jwt: JwtSigner;
  set: any;
}) {
  const { username, email, password, securityQuestion, securityAnswer } = body;
  const errors = validateRegistration(username, email, password);
  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  if (!securityQuestion || !securityAnswer) {
    set.status = 400;
    return { errors: [{ field: "securityQuestion", message: "Security question and answer are required" }] };
  }

  const existingUser = await (db.query as any).usersTable.findFirst({
    where: (users: any, { or, eq }: any) =>
      or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    set.status = 409;
    return { errors: [{ field: "email", message: "User already exists" }] };
  }

  const passwordHash = await hashPassword(password);
  const securityAnswerHash = await hashPassword(securityAnswer.toLowerCase().trim());
  const verificationToken = generateSecureToken(32);

  await db
  .insert(usersTable)
  .values({
    username,
    email,
    passwordHash,
    securityQuestion,
    securityAnswerHash,
    verificationToken,
    emailVerified: false,
  });

  await sendVerificationEmail(email, username, verificationToken);

  set.status = 201;
  return {
    message: "Account created. Please check your email to verify your account.",
  };
}

export async function handleLogin({
  body,
  jwt,
  set,
}: {
  body: { email: string; password: string };
  jwt: JwtSigner;
  set: any;
}) {
  const { email, password } = body;
  const errors = validateLogin(email, password);
  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }
  const user = await (db.query as any).usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    set.status = 401;
    return { error: "Invalid email or password" };
  }
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    set.status = 401;
    return { error: "Invalid email or password" };
  }

  if (!user.emailVerified) {
    set.status = 403;
    return { error: "Please verify your email before logging in" };
  }

  const token = await jwt.sign({ userId: user.id });
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    role: user.role,
    token,
  };
}
export async function handleCreateMarket({
  body,
  set,
  user,
}: {
  body: { title: string; description?: string; outcomes: string[] };
  set: any;
  user: any;
}) {
  const { title, description, outcomes } = body;
  const errors = validateMarketCreation(title, description || "", outcomes);
  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }
  const market = await db
    .insert(marketsTable)
    .values({ title, description: description || null, createdBy: user.id })
    .returning();
  const outcomeIds = await db
    .insert(marketOutcomesTable)
    .values(
      outcomes.map((title: string, index: number) => ({
        marketId: market[0]!.id,
        title,
        position: index,
      })),
    )
    .returning();
  set.status = 201;
  return {
    id: market[0]!.id,
    title: market[0]!.title,
    description: market[0]!.description,
    status: market[0]!.status,
    outcomes: outcomeIds,
  };
}

export async function handleListMarkets({
  query,
}: {
  query: {
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  };
}) {
  const statusFilter = (query.status || "active") as "active" | "resolved";
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const offset = (page - 1) * limit;
  const sortBy = query.sortBy || "date";
  const sortOrder = query.sortOrder || "desc";

  const orderByClause =
    sortBy === "totalBets"
      ? sortOrder === "asc" ? asc(sql`totalBets`) : desc(sql`totalBets`)
      : sortBy === "participants"
      ? sortOrder === "asc" ? asc(sql`participants`) : desc(sql`participants`)
      : sortOrder === "asc" ? asc(marketsTable.createdAt) : desc(marketsTable.createdAt);

  const markets = await db
    .select({
      id: marketsTable.id,
      title: marketsTable.title,
      description: marketsTable.description,
      status: marketsTable.status,
      createdAt: marketsTable.createdAt,
      createdBy: marketsTable.createdBy,
      resolvedOutcomeId: marketsTable.resolvedOutcomeId,
      totalBets: sql<number>`COALESCE(SUM(${betsTable.amount}), 0)`.as("totalBets"),
      participants: sql<number>`COUNT(DISTINCT ${betsTable.userId})`.as("participants"),
    })
    .from(marketsTable)
    .leftJoin(betsTable, eq(betsTable.marketId, marketsTable.id))
    .where(eq(marketsTable.status, statusFilter))
    .groupBy(marketsTable.id)
    .orderBy(orderByClause)
    .limit(limit + 1)
    .offset(offset);

  const hasMore = markets.length > limit;
  const paginatedMarkets = markets.slice(0, limit);

  if (paginatedMarkets.length === 0) {
    return { data: [], hasMore: false };
  }

  const marketIds = paginatedMarkets.map((m) => m.id);
  const outcomes = await (db.query as any).marketOutcomesTable.findMany({
    where: (outcomes: any, { inArray }: any) => inArray(outcomes.marketId, marketIds),
    orderBy: (outcomes: any, { asc }: any) => asc(outcomes.position),
  });

  const allBets = await db
    .select()
    .from(betsTable)
    .where(sql`${betsTable.marketId} IN ${marketIds}`);

  const creatorIds = [...new Set(paginatedMarkets.map((m) => m.createdBy))];
  const creators = await (db.query as any).usersTable.findMany({
    where: (users: any, { inArray }: any) => inArray(users.id, creatorIds),
    columns: { id: true, username: true },
  });

  const result = paginatedMarkets.map((market) => {
    const marketOutcomes = outcomes.filter((o: any) => o.marketId === market.id);
    const creator = creators.find((c: any) => c.id === market.createdBy);
    const totalMarketBets = Number(market.totalBets);
    const marketBets = allBets.filter((b: any) => b.marketId === market.id);

    return {
      id: market.id,
      title: market.title,
      description: market.description,
      status: market.status,
      createdAt: market.createdAt,
      creator: { username: creator?.username ?? "unknown" },
      totalMarketBets,
      participants: Number(market.participants),
      outcomes: marketOutcomes.map((outcome: any) => {
        const outcomeBets = marketBets
          .filter((b: any) => b.outcomeId === outcome.id)
          .reduce((sum: number, b: any) => sum + b.amount, 0);
        const odds =
          totalMarketBets > 0
            ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2))
            : 0;
        return { id: outcome.id, title: outcome.title, odds, totalBets: outcomeBets };
      }),
    };
  });

  return { data: result, hasMore };
}

export async function handleGetMarket({
  params,
  set,
}: {
  params: { id: number };
  set: any;
}) {
  const market = await (db.query as any).marketsTable.findFirst({
    where: eq(marketsTable.id, params.id),
    with: {
      creator: { columns: { username: true } },
      outcomes: {
        orderBy: (outcomes: any, { asc }: any) => asc(outcomes.position),
      },
    },
  });
  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }
  const betsPerOutcome = await Promise.all(
    market.outcomes.map(async (outcome: any) => {
      const totalBets = await db
        .select()
        .from(betsTable)
        .where(eq(betsTable.outcomeId, outcome.id));
      const totalAmount = totalBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
      return { outcomeId: outcome.id, totalBets: totalAmount };
    }),
  );
  const totalMarketBets = betsPerOutcome.reduce((sum: number, b: any) => sum + b.totalBets, 0);
  return {
    id: market.id,
    title: market.title,
    description: market.description,
    status: market.status,
    resolvedOutcomeId: market.resolvedOutcomeId,
    creator: market.creator?.username,
    outcomes: market.outcomes.map((outcome: any) => {
      const outcomeBets =
        betsPerOutcome.find((b: any) => b.outcomeId === outcome.id)?.totalBets || 0;
      const odds =
        totalMarketBets > 0
          ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2))
          : 0;
      return { id: outcome.id, title: outcome.title, odds, totalBets: outcomeBets };
    }),
    totalMarketBets,
  };
}

export async function handlePlaceBet({
  params,
  body,
  set,
  user,
}: {
  params: { id: number };
  body: { outcomeId: number; amount: number };
  set: any;
  user: any;
}) {
  const marketId = params.id;
  const { outcomeId, amount } = body;
  const betAmount = Number(amount);

  if (user.role === "admin") {
    set.status = 403;
    return { error: "Admins cannot place bets" };
  }

  const errors = validateBet(betAmount);
  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }
  const market = await (db.query as any).marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
  });
  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }
  if (market.status !== "active") {
    set.status = 400;
    return { error: "Market is not active" };
  }
  const outcome = await (db.query as any).marketOutcomesTable.findFirst({
    where: and(
      eq(marketOutcomesTable.id, outcomeId),
      eq(marketOutcomesTable.marketId, marketId),
    ),
  });
  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }
  try {
    const betResult = await db.transaction(async (tx) => {
      const currentUser = await (tx.query as any).usersTable.findFirst({
        where: eq(usersTable.id, user.id),
      });
      if (!currentUser) throw new Error("User not found");
      if (currentUser.balance < betAmount) throw new Error("Insufficient funds");
      const newBalance = currentUser.balance - betAmount;
      await tx.update(usersTable).set({ balance: newBalance }).where(eq(usersTable.id, user.id));
      const bet = await tx
        .insert(betsTable)
        .values({ userId: user.id, marketId, outcomeId, amount: betAmount })
        .returning();
      return {
        id: bet[0]!.id,
        userId: bet[0]!.userId,
        marketId: bet[0]!.marketId,
        outcomeId: bet[0]!.outcomeId,
        amount: bet[0]!.amount,
        newBalance,
      };
    });
    set.status = 201;
    return betResult;
  } catch (error: any) {
    set.status = 400;
    return { error: error.message || "Failed to place bet" };
  }
}

export async function handleResolveMarket({
  params,
  body,
  set,
  user,
}: {
  params: { id: number };
  body: { outcomeId: number };
  set: any;
  user: any;
}) {
  if (!user || user.role !== "admin") {
    set.status = 403;
    return { error: "Forbidden: admins only" };
  }
  const marketId = params.id;
  const { outcomeId } = body;
  const market = await (db.query as any).marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
  });
  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }
  if (market.status === "resolved") {
    set.status = 400;
    return { error: "Market already resolved" };
  }
  const outcome = await (db.query as any).marketOutcomesTable.findFirst({
    where: and(
      eq(marketOutcomesTable.id, outcomeId),
      eq(marketOutcomesTable.marketId, marketId),
    ),
  });
  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(marketsTable)
        .set({ status: "resolved", resolvedOutcomeId: outcomeId })
        .where(eq(marketsTable.id, marketId));
      const allBets = await tx.select().from(betsTable).where(eq(betsTable.marketId, marketId));
      const totalPool = allBets.reduce((sum: number, b: any) => sum + b.amount, 0);
      const winningBets = allBets.filter((b: any) => b.outcomeId === outcomeId);
      const totalWinningStake = winningBets.reduce((sum: number, b: any) => sum + b.amount, 0);
      if (totalWinningStake === 0) {
        for (const bet of allBets) {
          const currentUser = await (tx.query as any).usersTable.findFirst({
            where: eq(usersTable.id, bet.userId),
          });
          if (currentUser) {
            await tx
              .update(usersTable)
              .set({ balance: currentUser.balance + bet.amount })
              .where(eq(usersTable.id, bet.userId));
          }
        }
      } else {
        for (const bet of winningBets) {
          const payout = (bet.amount / totalWinningStake) * totalPool;
          const currentUser = await (tx.query as any).usersTable.findFirst({
            where: eq(usersTable.id, bet.userId),
          });
          if (currentUser) {
            await tx
              .update(usersTable)
              .set({ balance: currentUser.balance + payout })
              .where(eq(usersTable.id, bet.userId));
          }
        }
      }
    });
    return { success: true, message: "Market resolved and payouts distributed" };
  } catch (error: any) {
    set.status = 500;
    return { error: error.message || "Failed to resolve market" };
  }
}

export async function handleGetLeaderboard({
  query,
}: {
  query: { page?: number };
}) {
  const page = Number(query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const users = await db
    .select({ username: usersTable.username, balance: usersTable.balance })
    .from(usersTable)
    .orderBy(desc(usersTable.balance))
    .limit(limit + 1)
    .offset(offset);
  const hasMore = users.length > limit;
  const paginatedUsers = users.slice(0, limit);
  return {
    data: paginatedUsers.map((user, index) => ({
      rank: offset + index + 1,
      username: user.username,
      balance: user.balance,
      earnings: user.balance - 1000,
    })),
    hasMore,
  };
}

export async function handleGetProfile({
  user,
  query,
  set,
}: {
  user: any;
  query: { activePage?: number; resolvedPage?: number };
  set: any;
}) {
  if (!user) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
  const activePage = Number(query.activePage) || 1;
  const resolvedPage = Number(query.resolvedPage) || 1;
  const limit = 20;
  const activeOffset = (activePage - 1) * limit;
  const resolvedOffset = (resolvedPage - 1) * limit;
  const allBets = await db
    .select({
      betId: betsTable.id,
      amount: betsTable.amount,
      createdAt: betsTable.createdAt,
      marketId: marketsTable.id,
      marketTitle: marketsTable.title,
      marketStatus: marketsTable.status,
      resolvedOutcomeId: marketsTable.resolvedOutcomeId,
      outcomeId: marketOutcomesTable.id,
      outcomeTitle: marketOutcomesTable.title,
    })
    .from(betsTable)
    .innerJoin(marketsTable, eq(betsTable.marketId, marketsTable.id))
    .innerJoin(marketOutcomesTable, eq(betsTable.outcomeId, marketOutcomesTable.id))
    .where(eq(betsTable.userId, user.id));
  const activeBets = allBets.filter((b: any) => b.marketStatus === "active");
  const resolvedBets = allBets.filter((b: any) => b.marketStatus === "resolved");
  const paginatedActive = activeBets.slice(activeOffset, activeOffset + limit + 1);
  const paginatedResolved = resolvedBets.slice(resolvedOffset, resolvedOffset + limit + 1);
  const activeBetsWithOdds = await Promise.all(
    paginatedActive.slice(0, limit).map(async (bet: any) => {
      const allOutcomeBets = await db
        .select()
        .from(betsTable)
        .where(eq(betsTable.marketId, bet.marketId));
      const totalPool = allOutcomeBets.reduce((sum: number, b: any) => sum + b.amount, 0);
      const outcomeBets = allOutcomeBets
        .filter((b: any) => b.outcomeId === bet.outcomeId)
        .reduce((sum: number, b: any) => sum + b.amount, 0);
      const odds =
        totalPool > 0 ? Number(((outcomeBets / totalPool) * 100).toFixed(2)) : 0;
      return {
        betId: bet.betId,
        amount: bet.amount,
        createdAt: bet.createdAt,
        marketId: bet.marketId,
        marketTitle: bet.marketTitle,
        outcomeId: bet.outcomeId,
        outcomeTitle: bet.outcomeTitle,
        odds,
      };
    }),
  );
  return {
    balance: user.balance,
    role: user.role,
    activeBets: {
      data: activeBetsWithOdds,
      hasMore: paginatedActive.length > limit,
    },
    resolvedBets: {
      data: paginatedResolved.slice(0, limit).map((bet: any) => ({
        betId: bet.betId,
        amount: bet.amount,
        createdAt: bet.createdAt,
        marketId: bet.marketId,
        marketTitle: bet.marketTitle,
        outcomeId: bet.outcomeId,
        outcomeTitle: bet.outcomeTitle,
        won: bet.outcomeId === bet.resolvedOutcomeId,
      })),
      hasMore: paginatedResolved.length > limit,
    },
  };
}

export async function handleGenerateApiKey({
  user,
  set,
}: {
  user: any;
  set: any;
}) {
  if (!user) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
  const rawKey = `sk_${generateSecureToken(32)}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  await db.delete(apiKeysTable).where(eq(apiKeysTable.userId, user.id));
  await db.insert(apiKeysTable).values({
    userId: user.id,
    keyHash,
    createdAt: new Date(),
  });
  set.status = 201;
  return { apiKey: rawKey };
}

export async function handleGetApiKey({
  user,
  set,
}: {
  user: any;
  set: any;
}) {
  if (!user) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
  const existing = await (db.query as any).apiKeysTable.findFirst({
    where: eq(apiKeysTable.userId, user.id),
  });
  return { hasApiKey: !!existing };
}

export async function handleGetSecurityQuestion({
  params,
  set,
}: {
  params: { email: string };
  set: any;
}) {
  const user = await (db.query as any).usersTable.findFirst({
    where: eq(usersTable.email, params.email),
  });
  if (!user) {
    set.status = 404;
    return { error: "No account found with that email" };
  }
  if (!user.securityQuestion) {
    set.status = 400;
    return { error: "No security question set for this account" };
  }
  return { securityQuestion: user.securityQuestion };
}

export async function handleResetPassword({
  body,
  set,
}: {
  body: { email: string; securityAnswer: string; newPassword: string };
  set: any;
}) {
  const { email, securityAnswer, newPassword } = body;
  const user = await (db.query as any).usersTable.findFirst({
    where: eq(usersTable.email, email),
  });
  if (!user) {
    set.status = 404;
    return { error: "No account found with that email" };
  }
  if (!user.securityAnswerHash) {
    set.status = 400;
    return { error: "No security question set for this account" };
  }
  const answerCorrect = await verifyPassword(
    securityAnswer.toLowerCase().trim(),
    user.securityAnswerHash
  );
  if (!answerCorrect) {
    set.status = 401;
    return { error: "Incorrect security answer" };
  }
  if (!newPassword || newPassword.length < 6) {
    set.status = 400;
    return { error: "Password must be at least 6 characters" };
  }
  const newPasswordHash = await hashPassword(newPassword);
  await db
    .update(usersTable)
    .set({ passwordHash: newPasswordHash })
    .where(eq(usersTable.id, user.id));
  return { success: true, message: "Password updated successfully" };
}

export async function handleVerifyEmail({
  query,
  set,
}: {
  query: { token: string };
  set: any;
}) {
  const { token } = query;

  if (!token) {
    set.status = 400;
    return { success: false, message: "Invalid verification token" };
  }

  const user = await (db.query as any).usersTable.findFirst({
    where: eq(usersTable.verificationToken, token),
  });

  if (!user) {
    set.status = 400;
    return { success: false, message: "Invalid or expired verification token" };
  }

  await db
    .update(usersTable)
    .set({ emailVerified: true, verificationToken: null })
    .where(eq(usersTable.id, user.id));

  return { success: true, message: "Email verified successfully" };
}

export async function handleForgotPassword({
  body,
  set,
}: {
  body: { email: string };
  set: any;
}) {
  const { email } = body;

  const user = await (db.query as any).usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  // Avoid account enumeration by returning the same response for unknown emails.
  if (!user) {
    return { message: "If this email exists you will receive a reset link shortly." };
  }

  const resetToken = generateSecureToken(32);
  const resetTokenExpiry = Date.now() + 60 * 60 * 1000;

  await db
    .update(usersTable)
    .set({ resetToken, resetTokenExpiry })
    .where(eq(usersTable.id, user.id));

  await sendPasswordResetEmail(email, user.username, resetToken);

  return { message: "If this email exists you will receive a reset link shortly." };
}

export async function handleResetPasswordWithToken({
  body,
  set,
}: {
  body: { token: string; newPassword: string };
  set: any;
}) {
  const { token, newPassword } = body;

  const user = await (db.query as any).usersTable.findFirst({
    where: eq(usersTable.resetToken, token),
  });

  if (!user) {
    set.status = 400;
    return { error: "Invalid or expired reset token" };
  }

  if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
    set.status = 400;
    return { error: "Reset link has expired. Please request a new one." };
  }

  if (!newPassword || newPassword.length < 6) {
    set.status = 400;
    return { error: "Password must be at least 6 characters" };
  }

  const newPasswordHash = await hashPassword(newPassword);

  await db
    .update(usersTable)
    .set({ passwordHash: newPasswordHash, resetToken: null, resetTokenExpiry: null })
    .where(eq(usersTable.id, user.id));

  return { success: true, message: "Password reset successfully" };
}