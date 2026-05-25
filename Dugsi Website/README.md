# Dugsi — Quran Teacher Web App

A web app that replaces paper notebooks for Quran teachers. Two faces:

- **Student / parent view:** progress bar across the whole Quran, monthly goal progress, and the list of mistakes the teacher marked on their surahs.
- **Teacher view:** everything the student sees, plus a tappable Arabic Quran viewer to mark ayahs in red as mistakes, manage students, and run monthly tuition payments (Apple Pay / Google Pay / card via Stripe, auto-recurring).

Built to scale to other teachers later — multi-tenant by `teacher_id` from day one.

---

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router
- **Backend / DB:** Supabase (Postgres + Auth + Row-Level Security)
- **Payments:** Stripe Subscriptions via Payment Element (Apple Pay, Google Pay, cards)
- **Quran text:** [alquran.cloud](https://alquran.cloud/api) free API (Uthmani Arabic)

---

## Quick start (one-time setup)

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to <https://supabase.com> and create a new project (free tier is fine).
2. In the SQL editor, paste and run the contents of `supabase/schema.sql`.
3. From **Project settings → API**, copy:
   - `Project URL`
   - `anon` public key
4. Copy `.env.example` to `.env` and fill those in:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

### 3. Create the first teacher account

The schema gives the first signed-up user the **teacher** role automatically. So:

```bash
npm run dev
```

…then open <http://localhost:5173>, click **Sign up**, and create your teacher's account. Done — they're now the teacher.

After that, the teacher adds students from the **Students** tab. Each student gets their own login (email + password the teacher sets).

### 4. (Optional, when ready) wire up Stripe

This is the only part that requires a real account. Manual payment tracking works without it.

1. Create a Stripe account at <https://stripe.com>.
2. Create a **Product** called "Monthly Tuition" with a **Recurring** price (e.g. $50/month).
3. Copy the **Price ID** (looks like `price_...`).
4. Add to your `.env`:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_MONTHLY_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
5. Deploy the Supabase Edge Functions in `supabase/functions/`:
   ```bash
   npx supabase functions deploy create-subscription
   npx supabase functions deploy stripe-webhook
   ```
6. Point a Stripe webhook at `https://<your-project>.supabase.co/functions/v1/stripe-webhook` listening for:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`

---

## What's built

| Feature | Status |
|---|---|
| Email/password auth | Working |
| Teacher dashboard | Working |
| Student / parent dashboard | Working |
| Whole-Quran progress bar | Working |
| Monthly goal + progress bar | Working |
| Tappable Arabic Quran viewer | Working |
| Teacher marks ayahs as mistakes (highlighted red) | Working |
| Mistake notes + resolve | Working |
| Student list of all open mistakes | Working |
| Manual payment tracking (mark paid/unpaid per month) | Working |
| Stripe subscription scaffold (Apple Pay / Google Pay / card) | Code present, requires Stripe keys to enable |
| Auto-recurring monthly billing | Built on Stripe Subscriptions |

---

## How to scale to more teachers

Everything is keyed on `teacher_id` and protected by RLS — a teacher can only see their own students, mistakes, and payments. To onboard another teacher later:

1. Either let them sign up and flip their `role` to `teacher` in the `profiles` table, or
2. Add a "Sign up as a teacher" flow (just remove the role gate in `Signup.jsx`).

No code changes needed for the data model.

---

## Project layout

```
.
├── README.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
├── supabase/
│   ├── schema.sql                # tables + RLS policies + triggers
│   └── functions/
│       ├── create-subscription/  # Stripe SetupIntent + Subscription
│       └── stripe-webhook/       # records paid/failed invoices
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   ├── supabase.js
    │   └── quran.js              # AlQuran.cloud client + surah metadata
    ├── context/
    │   └── AuthContext.jsx
    ├── components/
    │   ├── Layout.jsx
    │   ├── ProgressBar.jsx
    │   ├── SurahViewer.jsx       # the tappable Arabic page
    │   ├── MistakeModal.jsx
    │   ├── PaymentMethodForm.jsx # Stripe Payment Element
    │   └── ProtectedRoute.jsx
    └── pages/
        ├── Login.jsx
        ├── Signup.jsx
        ├── StudentDashboard.jsx
        ├── StudentSurah.jsx
        ├── TeacherDashboard.jsx
        ├── TeacherStudents.jsx
        ├── TeacherStudent.jsx
        └── Payments.jsx
```

---

## Important notes

- **Right-to-left:** Arabic ayahs render RTL with a proper Uthmani font.
- **Offline-ish:** the Quran text is fetched per-surah and cached in memory; first load of each surah takes a second.
- **Security:** all student data is gated by Supabase RLS, not just frontend checks. A student can't fetch another student's mistakes even if they hand-craft an API call.
- **No card data ever touches our server:** Stripe's Payment Element handles it directly. We only store a `stripe_subscription_id`.


-- Expectations form macaalin:
- have a attendance/tracking if students are coming, notification to the teacher when student is absent, notify teacher for every month if student missed 2 or more classes
- Goals: wants to see weekly goals, monthly goals, 6 months goals, and annual goals.
- payment : he wants to have to have two options for payments, one being the automactic payments, and another being manual payments, with a checker that is on the teachers side to check off if the student paid. also to have a yearly payment calendar telling the teacher if the student made payment or missed payment for the month. 
- data area for all students for the teachers side. allow the teacher to see where everyone is , like who is on which juz and all the students that are near each other. 