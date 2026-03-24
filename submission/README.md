# Submission

# Short description:

> A full stack prediction market platform built for the Vertigo 2026 Junior Developer Internship.

---

## What is PredictMarket?

PredictMarket is a web application where users can create markets on real world events, place bets on outcomes using tokens, and win rewards based on how accurately they predict results. Think of it as a simplified version of platforms like Polymarket — built entirely from scratch as part of this internship challenge.

Every user starts with 1000 tokens. No deposits, no real money. The goal is to trade on your predictions and grow your balance.

---

## Tech Stack

### Frontend
| Technology | Why I chose it |
|---|---|
| React + TypeScript | Industry standard. TypeScript catches bugs at compile time instead of runtime — critical when handling user balances and financial data |
| TanStack Router | File-based routing with full TypeScript support. Cleaner than React Router for typed params |
| TanStack Form | Lightweight form handling with built-in validation. No need for heavy libraries like Formik |
| Tailwind CSS | Utility-first CSS that keeps styles colocated with components. No context switching between files |
| Recharts | Simple, composable chart library for the bet distribution pie chart |

### Backend
| Technology | Why I chose it |
|---|---|
| Bun | Faster JavaScript runtime than Node.js. Built-in SQLite support, TypeScript out of the box |
| Elysia.js | Designed specifically for Bun. End-to-end type safety between backend and frontend |
| JWT (JSON Web Tokens) | Stateless authentication — no server-side session storage needed. Scales horizontally |
| Argon2 | The gold standard for password hashing. Deliberately slow and memory-intensive — brute force is computationally infeasible |
| SHA-256 | Fast cryptographic hashing for API keys. Speed is acceptable here since keys are long random strings |
| Resend | Simple transactional email API for verification and password reset emails |

### Database
| Technology | Why I chose it |
|
_ SQLite | Perfect for a self-contained project. No separate database server to manage. Bun has native support |
| Drizzle ORM | TypeScript-first ORM with full type inference. Queries feel like SQL but are fully typed |

---

## Features

### Authentication System

New users register with a username, email, password, and a personal security question. After registration, the account is inactive until the user verifies their email by clicking a link sent through Resend. This prevents fake accounts and ensures every registered email address is real and accessible.

Passwords are never stored in plain text. They are hashed using Argon2id before being written to the database. Even if an attacker obtained a full copy of the database, recovering a single password would take thousands of years of computing time per hash.

JWT tokens are issued on login and expire after 7 days. The token is stored in localStorage and sent as a Bearer token on every authenticated request.

### Password Recovery — Two Methods

I implemented two independent password recovery paths because I wanted users to always have a way back into their account even if they no longer have access to their registered email.

**Email reset:** The user enters their email, a unique UUID reset token is generated and stored in the database with a one hour expiry timestamp, and a password reset link is sent via Resend. When the user clicks the link, the token is verified against the database, the expiry is checked, the new password is hashed and stored, and the token is immediately deleted so it cannot be reused.

**Security question reset:** The user enters their email, the system retrieves their personal security question, and they must answer it correctly. The answer is compared against a stored Argon2 hash — the same security model as passwords. On success the password is updated directly.

### Prediction Markets

Users can create markets with a custom title, description, and any number of outcomes. Markets start as active and can only be resolved by administrators.

The dashboard lists all markets with real-time odds, total token volume, and participant count. Markets can be sorted by creation date, total volume, or number of participants, and filtered between active and resolved. Results are paginated at 20 per page.

### Betting and Odds Calculation

Odds are not fixed — they are calculated dynamically from the actual bets in the database. If 300 tokens are bet on "Yes" out of a total pool of 500 tokens, the odds for "Yes" are 60%. Every time a new bet is placed, the odds across all outcomes recalculate automatically.

This is intentional. It mirrors how real prediction markets work — the crowd's money determines the probability. No manual odds setting needed.

### ACID Transactions for Financial Integrity

Every bet placement is wrapped in a database transaction:

1. Fetch current user balance
2. Validate sufficient funds
3. Deduct bet amount from balance
4. Record bet in database
5. Commit

If the server crashes between steps 3 and 4, the transaction rolls back entirely. The user keeps their tokens and no phantom bet is recorded. Without transactions, a crash at the wrong moment could permanently destroy tokens or create bets without deducting balance. ACID compliance makes this mathematically impossible.

### Market Resolution and Payouts

When an admin resolves a market by selecting the winning outcome, the system distributes the entire token pool to winning bettors proportionally to their stake.

If a user bet 100 tokens on the winning outcome and the total winning stake was 400 tokens, they receive 25% of the full pool. This means winners always receive more than they bet — they absorb the losing side's tokens.

Edge case handled: if nobody bet on the winning outcome, a full refund is issued to every bettor rather than burning the tokens. This was a deliberate design decision — punishing users for an admin choosing an unpopular outcome would be unfair.

All payout calculations and balance updates run inside a single transaction for the same integrity reasons as betting.

### Real-Time Updates

The dashboard and market detail pages poll the server every 30 seconds to fetch updated odds. When multiple users are betting simultaneously, everyone watching the same market sees the odds shift in near real-time without needing to refresh the page.

I chose polling over WebSockets deliberately. Bets are not high-frequency events — a 30-second delay is imperceptible to users. WebSockets would add significant connection management complexity for minimal practical benefit at this scale. The right tool for the job is the simplest one that meets the requirements.

### Role System and Admin Access

Users have one of two roles: `user` or `admin`. Roles are stored in the database and verified server-side on every relevant request. The frontend conditionally renders the admin panel based on the role in the JWT payload, but the backend independently checks the role from the database before allowing any admin action.

This means manipulating localStorage or forging a JWT payload with `"role": "admin"` accomplishes nothing — the server always goes to the database.

### API Keys for Bot Access

Hank's requirements mentioned that users might want to place bets programmatically using bots. I implemented API key authentication to support this.

From the profile page, users can generate a personal API key in the format `sk_<random32chars>`. The raw key is shown exactly once and never stored. Only the SHA-256 hash of the key is persisted in the database.

On each request, the server hashes the incoming key and compares it against stored hashes. This means a database leak exposes nothing useful — SHA-256 hashes of long random keys are computationally irreversible.

The authentication layer is split into two separate concerns. The JWT plugin (plugins/jwt.ts) handles token signing and verification and is registered globally on the Elysia app. The auth middleware (middleware/auth.middleware.ts) is a scoped Elysia plugin that runs on protected routes — it tries JWT first, then falls back to API key if no Bearer token is present. The critical implementation detail is that it must use .as("scoped") — without this, Elysia doesn't propagate the derived user object to route handlers. This took significant debugging to discover.

This is the same architecture pattern used by Stripe, GitHub, and most production APIs.

### Leaderboard

Users are ranked by current balance in descending order. Earnings are displayed as the difference from the starting balance of 1000 tokens — positive numbers mean profit, negative means loss. The leaderboard updates as markets resolve and payouts distribute.

---

## Database Design

### Schema

```
users           — id, username, email, passwordHash, balance, role, securityQuestion,
                  securityAnswerHash, emailVerified, verificationToken,
                  resetToken, resetTokenExpiry, createdAt, updatedAt

markets         — id, title, description, status, createdBy → users.id,
                  resolvedOutcomeId, createdAt

market_outcomes — id, marketId → markets.id, title, position

bets            — id, userId → users.id, marketId → markets.id,
                  outcomeId → market_outcomes.id, amount, createdAt

api_keys        — id, userId → users.id, keyHash, createdAt
```

### Why outcomes are a separate table

A market can have any number of outcomes — binary (Yes/No), ternary (Candidate A/B/C), or more. Storing outcomes as columns in the markets table would require knowing the maximum number of outcomes upfront and leaving most columns empty for simple markets. A separate table with a foreign key is the correct normalized approach.

### Why indexes

The following columns are indexed because they appear in WHERE clauses on every meaningful query:

- `bets.userId` — fetching a user's betting history
- `bets.marketId` — fetching bets for a specific market
- `markets.status` — filtering active vs resolved markets
- `api_keys.keyHash` — looking up API keys on every authenticated request

Without indexes, each of these queries would scan every row in the table. With indexes, the database goes directly to relevant rows in logarithmic time.

### Why LEFT JOIN for market listing

Markets with zero bets must still appear on the dashboard. A regular INNER JOIN would silently hide markets that nobody has bet on yet. LEFT JOIN preserves all markets regardless of bet count and returns zero for aggregate values when no bets exist.

---

## Security Decisions

**Why Argon2 and not bcrypt or SHA-256 for passwords?**

bcrypt is acceptable but Argon2 won the Password Hashing Competition in 2015 and is the current recommendation. SHA-256 is completely wrong for passwords — it is fast, which is the opposite of what you want. A fast hash means an attacker can test billions of guesses per second. Argon2 is designed to be slow and configurable in both time and memory cost.

**Why SHA-256 for API keys?**

The threat model is different. An API key is a 32-character random UUID — there are 2^128 possible values. Brute force is mathematically impossible regardless of hash speed. Using Argon2 would add 200ms to every API request, which is unacceptable for programmatic access. SHA-256 is the right choice here.

**Why JWT and not sessions?**

Sessions require the server to store session data and look it up on every request. JWT tokens are self-contained — the server verifies the cryptographic signature without any database query. This makes the authentication layer stateless and horizontally scalable. The tradeoff is that tokens cannot be revoked before expiry, which is acceptable for this application.

**Why verification tokens are UUIDs and not shorter codes?**

A 6-digit email verification code can be brute-forced in at most 1,000,000 attempts. A UUID has 2^122 possible values — brute force is not a practical attack. The user experience difference is minimal since they click a link rather than type the token manually.

---

## API Reference

All endpoints except registration, login, and password recovery require authentication via JWT Bearer token or API key.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/verify-email?token=` | Verify email address |
| GET | `/api/auth/security-question/:email` | Get security question |
| POST | `/api/auth/reset-password` | Reset via security question |
| POST | `/api/auth/forgot-password-email` | Send password reset email |
| POST | `/api/auth/reset-password-token` | Reset via email token |

### Markets

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/markets` | List markets with pagination and sorting |
| POST | `/api/markets` | Create a new market |
| GET | `/api/markets/:id` | Get market details with odds |
| POST | `/api/markets/:id/bets` | Place a bet |
| POST | `/api/markets/:id/resolve` | Resolve market (admin only) |

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/profile` | Get profile with bets |
| POST | `/api/users/api-keys` | Generate API key |
| GET | `/api/users/api-keys` | Check if API key exists |

### Leaderboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leaderboard` | Get ranked user list |

---

## Running the Project

### Prerequisites

- Bun v1.0 or higher
- Node.js (for some dev tooling)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd vertigo-internship-junior-developer-2026

# Install server dependencies
cd server
bun install

# Copy environment variables
cp .env.example .env
# Fill in JWT_SECRET, RESEND_API_KEY

# Push database schema
bunx drizzle-kit push

# Seed with test data
bun run db:seed

# Start the server
bun run dev
```

```bash
# In a new terminal, install client dependencies
cd client
bun install

# Start the client
bun run dev
```

The server runs on `http://localhost:4001` and the client on `http://localhost:3000`.

### Creating an Admin Account

Register through the app, then run the admin utility script:

```bash
cd server
bun src/db/makeadmin.ts
```

---

## Seeding Test Data

```bash
bun run db:seed        # Add test data
bun run db:reset       # Delete everything and reseed
bun run db:delete      # Delete all data
```

Test credentials after seeding:

| Username | Email | Password |
|---|---|---|
| alice | alice@example.com | password123 |
| bob | bob@example.com | password456 |
| charlie | charlie@example.com | password789 |

---

## Project Structure

```
vertigo-internship-junior-developer-2026/
├── server/
│   ├── src/
│   │   ├── api/
│   │   │   ├── handlers.ts          # All request handlers
│   │   │   ├── auth.routes.ts       # Auth endpoints
│   │   │   ├── markets.routes.ts    # Market and bet endpoints
│   │   │   ├── users.routes.ts      # Profile and API key endpoints
│   │   │   └── leaderboard.routes.ts
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle schema definitions
│   │   │   ├── index.ts             # Database connection
│   │   │   ├── seed.ts              # Test data seeder
│   │   │   └── makeadmin.ts         # Admin utility
│   │   ├── lib/
│   │   │   ├── auth.ts              # JWT and password utilities
│   │   │   ├── email.ts             # Resend email functions
│   │   │   └── validation.ts        # Input validation
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts   # JWT + API key authentication
│   │   └── plugins/
│   │       └── jwt.ts               # JWT plugin setup
│   ├── index.ts                     # Server entry point
│   └── drizzle.config.ts
├── client/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.tsx            # Dashboard
│   │   │   ├── leaderboard.tsx      # Leaderboard
│   │   │   ├── profile.tsx          # User profile
│   │   │   ├── markets/
│   │   │   │   ├── $id.tsx          # Market detail and betting
│   │   │   │   └── new.tsx          # Create market
│   │   │   └── auth/
│   │   │       ├── login.tsx
│   │   │       ├── register.tsx
│   │   │       ├── forgot-password.tsx
│   │   │       ├── reset-password.tsx
│   │   │       └── verify-email.tsx
│   │   └── lib/
│   │       ├── api.ts               # API client
│   │       └── auth-context.tsx     # Auth state management
│   └── package.json
└── README.md
```

---
# Problems Encountered
## Elysia middleware scoping

The auth middleware went through several broken implementations before working. The first attempt used .as("plugin") which Elysia doesn't support. The second used no .as() at all, which caused the derived user object to not propagate to route handlers , every protected route received undefined as the user even when a valid token was provided. The fix was .as("scoped"), which is documented but easy to miss.

## Drizzle ORM and manual migrations

Early in the project, database columns were added manually via raw SQLite commands instead of going through Drizzle's migration system. This caused Drizzle's schema diff to permanently lose sync with the actual database , drizzle-kit push would report "no changes detected" even when columns were missing, or would attempt to delete valid columns. The lesson learned is to never modify the database schema outside of Drizzle. The fix each time was to delete the Drizzle snapshot folder and push fresh, or in the worst cases, delete and recreate the database entirely from the schema.

## JWT token not propagating after registration

When email verification was added to the registration flow, the handler was changed to return only a success message instead of a JWT token. The frontend was still calling login(user) with that message object , which had no token , and storing it in localStorage. This caused every subsequent authenticated request to fail silently because the Authorization header contained garbage. The fix was to update the frontend to show a "check your email" screen instead of attempting to log in.

## handlers.ts duplication

On multiple occasions during development, I was accidentally appending the code to handlers.ts instead of replacing existing functions. This caused TypeScript errors like "Duplicate identifier" and "Cannot find name" because the same function was declared twice and orphaned code existed outside any function body. The fix each time was to select all and replace the entire file with the clean version.

## Browser autofill overriding dark theme

Chrome's autofill styling injected a white/blue background on form inputs, breaking the dark theme on the login and register pages. The fix was a CSS override using -webkit-box-shadow: 0 0 0px 1000px #0f1117 inset which forces the autofill background to match the app's color scheme.

## Resend free tier restrictions

Resend's free tier only allows sending emails to the account owner's verified email address. This was discovered after building the full email verification and password reset flow. For the demo, all email features are demonstrated using the developer's own email address. In production, this would be resolved by verifying a custom domain in Resend.

## Token column left in database

During development , I was trying to determine why the drizzle migration didn't work so a test column token_token was  added to the users table and committed to the schema. Drizzle tried to insert this column on every user creation, causing 500 errors. Because SQLite's ALTER TABLE DROP COLUMN doesn't clean up the schema text cleanly, the only reliable fix was a full database reset followed by a clean drizzle-kit push.

## Reflection

This was my first serious project in JavaScript and TypeScript. Coming from a background in C and lower-level languages, the ecosystem was unfamiliar at first , but I found that the type system in TypeScript made the transition manageable. Knowing that a wrong type would fail at compile time rather than silently corrupt data at runtime gave me confidence when building the financial logic.

I am glad that i could deepen my knowledge with REST APIs, as i haven't use them  much lately.
Honestly, wrapping up this project feels amazing. I'm also  thrilled that I got to really deep-dive into React, JWT, Bun, SQLite, and Resend. It's one thing to watch tutorials, but actually working on it was so fulfilling once it worked out.



---

*Built by Luca-Andrei Dobrescu — Polytechnic University of Bucharest, Faculty of Electronics, Telecommunications and Information Technology, 2026.*


## Images or Video Demo

[![PredictMarket Demo](https://img.youtube.com/vi/CTD_MpMQRR8/maxresdefault.jpg)](https://www.youtube.com/watch?v=CTD_MpMQRR8)