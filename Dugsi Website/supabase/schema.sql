-- ============================================================
-- Dugsi schema. Run this once in the Supabase SQL editor.
-- Safe to re-run: drops tables/policies first.
-- ============================================================

-- Clean slate ---------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.is_teacher(uuid);
drop table if exists public.payments cascade;
drop table if exists public.progress cascade;
drop table if exists public.monthly_goals cascade;
drop table if exists public.mistakes cascade;
drop table if exists public.profiles cascade;

-- ============================================================
-- profiles : one row per auth user, role = teacher | student
-- ============================================================
create table public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  role                    text not null check (role in ('teacher','student')),
  full_name               text not null,
  teacher_id              uuid references public.profiles(id) on delete set null, -- students point at their teacher
  monthly_rate_cents      int default 5000,        -- teachers: their tuition rate (in cents)
  stripe_customer_id      text,                    -- students: filled when they save a payment method
  stripe_subscription_id  text,                    -- students: filled when subscription is active
  created_at              timestamptz not null default now()
);

create index on public.profiles (teacher_id);
create index on public.profiles (role);

-- ============================================================
-- Auto-create a profile on every new auth signup.
-- First user becomes the teacher; everyone else defaults to student
-- and the teacher claims them by setting teacher_id.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  no_teacher_yet boolean;
begin
  select count(*) = 0 into no_teacher_yet from public.profiles where role = 'teacher';
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when no_teacher_yet then 'teacher' else 'student' end,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- mistakes : an ayah a student got wrong, surfaced as red
-- ============================================================
create table public.mistakes (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  surah_number  int  not null check (surah_number between 1 and 114),
  ayah_number   int  not null check (ayah_number >= 1),
  note          text,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (student_id, surah_number, ayah_number)
);

create index on public.mistakes (student_id, surah_number);
create index on public.mistakes (teacher_id);

-- ============================================================
-- monthly_goals : "memorize Surah Mulk this month", etc.
-- ============================================================
create table public.monthly_goals (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  teacher_id      uuid not null references public.profiles(id) on delete cascade,
  month           int  not null check (month between 1 and 12),
  year            int  not null,
  target_text     text not null,
  target_ayahs    int  not null default 0,
  completed_ayahs int  not null default 0,
  created_at      timestamptz not null default now(),
  unique (student_id, month, year)
);

-- ============================================================
-- progress : ayahs the student has memorized (for the whole-Quran bar)
-- ============================================================
create table public.progress (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  surah_number  int  not null check (surah_number between 1 and 114),
  ayah_number   int  not null check (ayah_number >= 1),
  memorized_at  timestamptz not null default now(),
  unique (student_id, surah_number, ayah_number)
);

create index on public.progress (student_id);

-- ============================================================
-- payments : one row per (student, month, year)
-- ============================================================
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  teacher_id        uuid not null references public.profiles(id) on delete cascade,
  month             int  not null check (month between 1 and 12),
  year              int  not null,
  amount_cents      int  not null,
  status            text not null check (status in ('unpaid','paid','failed','refunded')) default 'unpaid',
  paid_at           timestamptz,
  stripe_invoice_id text,
  created_at        timestamptz not null default now(),
  unique (student_id, month, year)
);

create index on public.payments (student_id);
create index on public.payments (teacher_id);

-- ============================================================
-- Row-level security
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.mistakes       enable row level security;
alter table public.monthly_goals  enable row level security;
alter table public.progress       enable row level security;
alter table public.payments       enable row level security;

-- helper, used in INSERT policies
create or replace function public.is_teacher(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'teacher')
$$;

-- ---- profiles ----
create policy "own profile readable"
  on public.profiles for select
  using (id = auth.uid());

create policy "teacher reads their students"
  on public.profiles for select
  using (teacher_id = auth.uid());

create policy "own profile updatable"
  on public.profiles for update
  using (id = auth.uid());

create policy "teacher updates their students"
  on public.profiles for update
  using (teacher_id = auth.uid());

create policy "teacher inserts student profile"
  on public.profiles for insert
  with check (teacher_id = auth.uid() and public.is_teacher(auth.uid()));

-- ---- mistakes ----
create policy "student reads own mistakes"
  on public.mistakes for select using (student_id = auth.uid());
create policy "teacher reads student mistakes"
  on public.mistakes for select using (teacher_id = auth.uid());
create policy "teacher writes mistakes"
  on public.mistakes for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ---- monthly_goals ----
create policy "student reads own goals"
  on public.monthly_goals for select using (student_id = auth.uid());
create policy "teacher reads student goals"
  on public.monthly_goals for select using (teacher_id = auth.uid());
create policy "teacher writes goals"
  on public.monthly_goals for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ---- progress ----
create policy "student reads own progress"
  on public.progress for select using (student_id = auth.uid());
create policy "teacher reads student progress"
  on public.progress for select using (teacher_id = auth.uid());
create policy "teacher writes progress"
  on public.progress for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ---- payments ----
create policy "student reads own payments"
  on public.payments for select using (student_id = auth.uid());
create policy "teacher reads student payments"
  on public.payments for select using (teacher_id = auth.uid());
create policy "teacher writes payments"
  on public.payments for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ============================================================
-- Useful view: whole-Quran progress per student (memorized ayahs / 6236)
-- ============================================================
create or replace view public.quran_progress as
select
  student_id,
  count(*)::int as memorized_ayahs,
  round(count(*)::numeric / 6236 * 100, 2) as percent
from public.progress
group by student_id;
