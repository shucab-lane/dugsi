# Dugsi: Quran School Management App

A web app that replaces paper notebooks for a Quran teacher and their students. Teachers track attendance, memorization progress and recitation mistakes, set goals, run classes, and collect monthly tuition. Students and parents see their own progress.

**Live demo:** https://shucab-lane.github.io/dugsi/ (click **Teacher view** or **Student view** to explore with sample data)

Built for a Quran teacher from their requirements: attendance tracking with alerts for repeated absences, weekly to yearly goals, automatic and manual tuition payments with a yearly payment calendar, and an overview of where every student is in the Quran.

## Features

**Teacher**
- Dashboard: student count, open mistakes, and who has paid this month
- **Attendance**: mark present / absent / late / excused per class day, "mark all present", and a warning for students with 2+ absences in a month
- **Quran progress**: a whole-Quran progress bar per student (out of 6,236 ayahs) and their current surah and juz
- **Tappable Arabic Quran viewer**: tap any ayah to mark a recitation mistake with a note; open mistakes show in red until resolved
- **Goals**: weekly, monthly, six-month and annual targets (ayahs, surahs, juz) with progress
- **Halaqa overview**: students grouped by juz, so students at the same point can practice together
- **Classes**: announcements, assignments with completion tracking, and class rosters
- **Payments**: manual "mark paid" per month, a yearly payment calendar, collected vs. outstanding totals, plus automatic monthly billing through Stripe subscriptions
- Add students and reset their passwords

**Student / parent**
- Progress across the whole Quran, open mistakes to fix, attendance over the last 30 days, and goals
- Classes, announcements and assignments
- Billing: set up auto-pay (Apple Pay, Google Pay or card) and see payment history

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Supabase (PostgreSQL, Auth, row-level security, Edge Functions in TypeScript/Deno)
- **Payments:** Stripe Subscriptions with the Payment Element, plus a webhook that records paid and failed invoices
- **Quran text:** [alquran.cloud](https://alquran.cloud/api) API (Uthmani script, rendered right-to-left)

## Architecture

```
React SPA ──► supabase-js ──► PostgreSQL (row-level security on every table)
    │                           ▲
    │                           │ webhook: invoice.paid / payment_failed
    └──► Edge Functions ──► Stripe (subscriptions, Payment Element)
         create-student · create-subscription · reset-student-password · stripe-webhook
```

- **Multi-tenant by design:** every row carries a `teacher_id`, and row-level security policies make sure a teacher only sees their own students and a student only sees their own data, even if someone crafts API calls by hand.
- **12 tables** (profiles, attendance, progress, mistakes, goals, payments, classes, class_enrollments, announcements, assignments, assignment_completions, monthly_goals), with schema changes applied through **7 SQL migrations** in [`supabase/`](supabase).
- **Card data never touches our code:** Stripe's Payment Element collects it, and we only store the customer and subscription IDs.

### Demo mode

The public demo runs without a database. When `VITE_DEMO_MODE=true`, [`src/lib/demo.js`](src/lib/demo.js) replaces the Supabase client with an in-browser implementation of the parts of the supabase-js API the app uses (select / insert / update / upsert / delete, `eq` / `in` / `is` / `gte` / `lt` filters, ordering, `single`, counts and foreign-key joins), backed by seeded sample data in `localStorage`. The app code is identical in both modes.

## Running locally

```bash
npm install
cp .env.example .env
```

- **Demo mode:** set `VITE_DEMO_MODE=true` in `.env`, then `npm run dev`
- **Real backend:**
  1. Create a Supabase project and run `supabase/run-all-migrations.sql` in the SQL editor
  2. Put the project URL and anon key in `.env`
  3. In Supabase Auth, turn off "Confirm email" so teachers can create student logins directly
  4. `npm run dev`, then sign up. The first account becomes the teacher

**Stripe (optional):** create a recurring "Monthly Tuition" price, set `VITE_STRIPE_PUBLISHABLE_KEY`, set the secrets with `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_MONTHLY_PRICE_ID=... STRIPE_WEBHOOK_SECRET=...`, deploy the functions with `npx supabase functions deploy`, and point a Stripe webhook at `/functions/v1/stripe-webhook` for `invoice.paid`, `invoice.payment_failed` and `customer.subscription.deleted`.

## Deploying

- **GitHub Pages (demo):** `npm run deploy:demo` builds in demo mode under `/dugsi/` and publishes to the `gh-pages` branch
- **Vercel / Netlify (real backend):** build command `npm run build`, output `dist`, set the `VITE_*` environment variables, and add an SPA rewrite to `index.html`

## Project structure

```
src/
  lib/          supabase client, demo backend, Quran metadata and API client
  context/      auth context (session + profile)
  components/   Quran viewer, mistake modal, goal cards, payment calendar, pickers
  pages/        teacher and student pages
supabase/
  schema.sql, migration-*.sql   tables, RLS policies, triggers
  functions/                    Edge Functions (Stripe + admin actions)
```
