import { eq, and } from "drizzle-orm";
import db from "../db";
import { usersTable, marketsTable, marketOutcomesTable, betsTable } from "../db/schema";
import { hashPassword, verifyPassword, type AuthTokenPayload } from "../lib/auth";
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
  body: { username: string; email: string; password: string };
  jwt: JwtSigner;
  set: any;
}) {
  const { username, email, password } = body;
  const errors = validateRegistration(username, email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const existingUser = await (db.query as any).usersTable.findFirst({
    where: (users: any, { or, eq }: any) => or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    set.status = 409;
    return { errors: [{ field: "email", message: "User already exists" }] };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await db.insert(usersTable).values({ username, email, passwordHash }).returning();

  const token = await jwt.sign({ userId: newUser[0]!.id });

   set.status = 201;
  set.status = 201;
  return {
    id: newUser[0]!.id,
    username: newUser[0]!.username,
    email: newUser[0]!.email,
    balance: newUser[0]!.balance,
    role: newUser[0]!.role,
    token,
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
    .values({
      title,
      description: description || null,
      createdBy: user.id,
    })
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
  query: { status?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string };
}) {
  const statusFilter = (query.status || "active") as "active" | "resolved";

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const offset = (page - 1) * limit;

  const markets = await (db.query as any).marketsTable.findMany({
    where: eq(marketsTable.status, statusFilter),
    limit: limit,
    offset: offset,
    with: {
      creator: {
        columns: { username: true },
      },
      outcomes: {
        orderBy: (outcomes: any, { asc }: any) => asc(outcomes.position),
      },
    },
  });

  const enrichedMarkets = await Promise.all(
    markets.map(async (market: any) => {
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
        status: market.status,
        creator: market.creator?.username,
        outcomes: market.outcomes.map((outcome: any) => {
          const outcomeBets =
            betsPerOutcome.find((b: any) => b.outcomeId === outcome.id)?.totalBets || 0;
          const odds =
            totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;

          return {
            id: outcome.id,
            title: outcome.title,
            odds,
            totalBets: outcomeBets,
          };
        }),
        totalMarketBets,
      };
    }),
  );

  return enrichedMarkets;
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
      creator: {
        columns: { username: true },
      },
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
    creator: market.creator?.username,
    outcomes: market.outcomes.map((outcome: any) => {
      const outcomeBets = betsPerOutcome.find((b: any) => b.outcomeId === outcome.id)?.totalBets || 0;
      const odds =
        totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;

      return {
        id: outcome.id,
        title: outcome.title,
        odds,
        totalBets: outcomeBets,
      };
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
  const errors = validateBet(betAmount);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  // 1. Verificări preliminare de bază (fără a deschide tranzacția încă)
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
    where: and(eq(marketOutcomesTable.id, outcomeId), eq(marketOutcomesTable.marketId, marketId)),
  });

  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }

  // 2. Inițierea tranzacției ACID
  try {
    const betResult = await db.transaction(async (tx) => {
      // a. Obținem balanța curentă a utilizatorului din interiorul tranzacției
      const currentUser = await (tx.query as any).usersTable.findFirst({
        where: eq(usersTable.id, user.id),
      });

      if (!currentUser) {
        throw new Error("User not found");
      }

      // b. Verificăm dacă are fonduri suficiente
      if (currentUser.balance < betAmount) {
        throw new Error("Insufficient funds");
      }

      // c. Dedublăm suma din balanță
      const newBalance = currentUser.balance - betAmount;
      await tx
        .update(usersTable)
        .set({ balance: newBalance })
        .where(eq(usersTable.id, user.id));

      // d. Înregistrăm pariul
      const bet = await tx
        .insert(betsTable)
        .values({
          userId: user.id,
          marketId,
          outcomeId,
          amount: betAmount,
        })
        .returning();

      return {
        id: bet[0]!.id,
        userId: bet[0]!.userId,
        marketId: bet[0]!.marketId,
        outcomeId: bet[0]!.outcomeId,
        amount: bet[0]!.amount,
        newBalance: newBalance, // Returnăm și balanța nouă
      };
    });

    set.status = 201;
    return betResult;

  } catch (error: any) {
    // Dacă oricare pas din tranzacție eșuează, executăm un rollback automat
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
      eq(marketOutcomesTable.marketId, marketId)
    ),
  });

  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }

  try {
    await db.transaction(async (tx) => {
      // 1. Mark market as resolved
      await tx
        .update(marketsTable)
        .set({ status: "resolved", resolvedOutcomeId: outcomeId })
        .where(eq(marketsTable.id, marketId));

      // 2. Get all bets for this market
      const allBets = await tx
        .select()
        .from(betsTable)
        .where(eq(betsTable.marketId, marketId));

      const totalPool = allBets.reduce((sum: number, b: any) => sum + b.amount, 0);

      // 3. Get winning bets
      const winningBets = allBets.filter((b: any) => b.outcomeId === outcomeId);
      const totalWinningStake = winningBets.reduce((sum: number, b: any) => sum + b.amount, 0);

      // 4. Distribute payouts to winners
      if (totalWinningStake > 0) {
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

      const odds = totalPool > 0
        ? Number(((outcomeBets / totalPool) * 100).toFixed(2))
        : 0;

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