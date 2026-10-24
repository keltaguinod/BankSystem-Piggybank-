# BankSystem

A personal banking dashboard built with **Next.js 15** (App Router) and **PostgreSQL**.

Features:
- **Dashboard** — annual (12-month) trend chart, live date & time, live weather, currency exchange + converter, current balance, and a recent-transaction history feed.
- **History** — full, filterable record of every transaction.
- **Withdrawal** — withdraw only from the authenticated user's account, with password re-verification and insufficient-funds protection.
- **Deposit** — add funds to your account.
- **Account Management** — edit profile (name, phone, address, preferred currency) and change password.
- **Auth** — strong-password registration, bcrypt hashing, short-lived signed sessions, login throttling, and account lockout.
- **Access control** — customer, auditor, and administrator roles enforced by the server APIs.
- **Security Center** — administrator role/status management and append-only audit logs.

External data uses free, key-less public APIs: **Open-Meteo** (weather) and **open.er-api.com** (currency rates).

---

## 1. Prerequisites

- Node.js 18.18+ (Node 22 recommended)
- A running PostgreSQL database

## 2. Install

```bash
npm install
```

## 3. Configure environment

Copy the example file and fill in your own values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_SSL=false        # set true if your host requires SSL
JWT_SECRET=<a long random string>
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4. Create the database schema

Point `DATABASE_URL` at **your** PostgreSQL, then run:

```bash
npm run db:init
```

This applies `db/schema.sql` (creates the `users` and `transactions` tables, indexes, and an `updated_at` trigger). You can also apply it manually:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

For an existing draft database, apply `db/migrate_security.sql` from inside the `db` directory,
then promote the initial administrator directly in PostgreSQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin@example.com';
```

> **Already created the database with an earlier version?** Run the migration to add the
> recipient/source account + phone fields without losing data:
> ```bash
> psql "$DATABASE_URL" -f db/migrate_counterparty.sql
> ```

## 5. Run

```bash
npm run dev          # development at http://localhost:3000
# or
npm run build && npm start   # production
```

Open `http://localhost:3000`, register an account, and you're in.

---

## Project structure

```
src/
  app/
    api/                  # API routes (auth, transactions, account, dashboard, external)
    dashboard/            # Dashboard page
    history/              # Transaction history
    withdrawal/           # Withdraw funds
    deposit/              # Deposit funds
    account/              # Account management
    login/  register/     # Auth pages
  components/Shell.js      # Sidebar + topbar (live clock) shell
  lib/
    db.js                 # PostgreSQL connection pool
    auth.js               # Password hashing + JWT session cookies
    client.js             # Client hooks + money formatter
db/
  schema.sql              # Database schema
  init.js                 # Schema applier (npm run db:init)
```

## Security notes

- Passwords require 12–128 characters and are hashed with bcrypt cost 12.
- Sessions are short-lived JWTs in `HttpOnly`, `SameSite=Lax`, production-only secure cookies. Role/status changes and password changes revoke existing sessions.
- Login attempts are rate-limited and accounts are temporarily locked after five failed attempts.
- Mutations enforce same-origin requests; security headers include CSP, frame denial, MIME sniffing protection, and production HSTS.
- Withdrawals and transfers lock account rows and write their audit record in the same database transaction.
- Audit logs are append-only at the database layer. They deliberately exclude passwords and session tokens.
- The in-memory rate limiter is suitable for one application instance. For a multi-instance production deployment, replace it with a shared Redis-backed limiter.
- `.env.local` is gitignored — **never commit your real database URL or JWT secret.**
