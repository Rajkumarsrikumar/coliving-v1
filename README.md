# CoTenanty Rental Platform

A React + Supabase app for tracking shared expenses, splitting costs, and managing contributions in CoTenanty spaces.

## Features

- **Authentication** – Email/password signup and login via Supabase Auth
- **Unit Management** – Create units, invite members, set contribution shares
- **Expense Tracking** – Log expenses by category (Rent, PUB, Cleaning, Provisions, Other)
- **Dashboard** – Monthly totals, category breakdown chart, balance visibility
- **Contributions** – Request one-time contributions (repairs, extra cleaning, etc.)
- **Dark Mode** – Full support with toggle

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + Framer Motion
- Supabase (Auth, PostgreSQL, Realtime)
- React Query, React Hook Form, Zod, Recharts

## Setup

1. **Clone and install**

   ```bash
   cd coliving-app
   npm install
   ```

2. **Supabase**

   - Create a project at [supabase.com](https://supabase.com)
   - Run the migration in `supabase/migrations/00001_initial_schema.sql` via the SQL Editor in the Supabase dashboard

3. **Environment**

   - Copy `.env.example` to `.env.local`
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings

4. **Run**

   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/     # UI components (Button, Card, etc.)
├── features/       # Auth, units, expenses, contributions
├── hooks/          # useAuth, useTheme
├── lib/            # Supabase client, utils
├── pages/          # Route pages
├── types/          # TypeScript types
└── App.tsx
```

## Supabase Schema

- `profiles` – User profiles (extends auth.users)
- `units` – CoTenanty properties
- `unit_members` – User–unit junction with role and share %
- `expenses` – Expense records
- `contributions` – One-time contribution requests
- `contribution_payments` – Payment tracking for contributions

All tables use Row Level Security (RLS) so users only access data for units they belong to.
