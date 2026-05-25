-- ============================================================
-- migration-2: attendance + multi-period goals + cohort/current-position fields
-- Run this once in the Supabase SQL editor AFTER schema.sql.
-- Safe to re-run.
-- ============================================================

-- ============================================================
-- attendance : one row per student per class day
-- ============================================================
drop table if exists public.attendance cascade;

create table public.attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  date        date not null,
  status      text not null check (status in ('present','absent','late','excused')) default 'present',
  note        text,
  created_at  timestamptz not null default now(),
  unique (student_id, date)
);

create index on public.attendance (teacher_id, date);
create index on public.attendance (student_id, date);

alter table public.attendance enable row level security;

create policy "student reads own attendance"
  on public.attendance for select using (student_id = auth.uid());
create policy "teacher reads student attendance"
  on public.attendance for select using (teacher_id = auth.uid());
create policy "teacher writes attendance"
  on public.attendance for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ============================================================
-- goals : generalised goals across period types
-- (replaces / supplements the existing monthly_goals table)
-- ============================================================
drop table if exists public.goals cascade;

create table public.goals (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  teacher_id      uuid not null references public.profiles(id) on delete cascade,
  period_type     text not null check (period_type in ('weekly','monthly','six_months','annual')),
  period_start    date not null,
  period_end      date not null,
  target_text     text not null,
  target_ayahs    int  not null default 0,
  completed_ayahs int  not null default 0,
  created_at      timestamptz not null default now(),
  unique (student_id, period_type, period_start)
);

create index on public.goals (student_id, period_type, period_start desc);
create index on public.goals (teacher_id);

alter table public.goals enable row level security;

create policy "student reads own goals2"
  on public.goals for select using (student_id = auth.uid());
create policy "teacher reads student goals2"
  on public.goals for select using (teacher_id = auth.uid());
create policy "teacher writes goals2"
  on public.goals for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ============================================================
-- profiles : add current Quran position for cohort view
-- ============================================================
alter table public.profiles
  add column if not exists current_surah int check (current_surah between 1 and 114),
  add column if not exists current_ayah  int check (current_ayah  >= 1);
