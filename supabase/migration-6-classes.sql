-- ============================================================
-- migration-6: multi-class support (Quran + other subjects).
-- Adds: classes, class_enrollments, announcements, assignments,
--       assignment_completions.
-- Each non-Quran class gets a Google-Classroom-style stream of
-- announcements + assignments, plus its own roster.
-- Safe to re-run.
-- ============================================================

drop table if exists public.assignment_completions cascade;
drop table if exists public.assignments cascade;
drop table if exists public.announcements cascade;
drop table if exists public.class_enrollments cascade;
drop table if exists public.classes cascade;

-- classes ----------------------------------------------------
create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  color       text default '#0e6b5e',
  created_at  timestamptz not null default now()
);
create index on public.classes (teacher_id);

-- enrollments ------------------------------------------------
create table public.class_enrollments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (class_id, student_id)
);
create index on public.class_enrollments (class_id);
create index on public.class_enrollments (student_id);

-- announcements (stream post) -------------------------------
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index on public.announcements (class_id, created_at desc);

-- assignments -----------------------------------------------
create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  created_at  timestamptz not null default now()
);
create index on public.assignments (class_id, due_date);

-- per-student done-tracking for assignments -----------------
create table public.assignment_completions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  note          text,
  unique (assignment_id, student_id)
);

-- ============================================================
-- RLS
-- ============================================================
alter table public.classes              enable row level security;
alter table public.class_enrollments    enable row level security;
alter table public.announcements        enable row level security;
alter table public.assignments          enable row level security;
alter table public.assignment_completions enable row level security;

-- helper: is this user enrolled in this class?
create or replace function public.is_enrolled(uid uuid, cid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.class_enrollments where student_id = uid and class_id = cid)
$$;

-- classes
drop policy if exists "teacher reads own classes"      on public.classes;
drop policy if exists "student reads enrolled classes" on public.classes;
drop policy if exists "teacher writes own classes"     on public.classes;

create policy "teacher reads own classes"
  on public.classes for select using (teacher_id = auth.uid());
create policy "student reads enrolled classes"
  on public.classes for select using (public.is_enrolled(auth.uid(), id));
create policy "teacher writes own classes"
  on public.classes for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- enrollments
drop policy if exists "teacher reads enrollments"      on public.class_enrollments;
drop policy if exists "student reads own enrollment"   on public.class_enrollments;
drop policy if exists "teacher writes enrollments"     on public.class_enrollments;

create policy "teacher reads enrollments"
  on public.class_enrollments for select
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));
create policy "student reads own enrollment"
  on public.class_enrollments for select using (student_id = auth.uid());
create policy "teacher writes enrollments"
  on public.class_enrollments for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

-- announcements
drop policy if exists "class members read announcements" on public.announcements;
drop policy if exists "teacher writes announcements"     on public.announcements;

create policy "class members read announcements"
  on public.announcements for select
  using (teacher_id = auth.uid() or public.is_enrolled(auth.uid(), class_id));
create policy "teacher writes announcements"
  on public.announcements for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- assignments
drop policy if exists "class members read assignments" on public.assignments;
drop policy if exists "teacher writes assignments"     on public.assignments;

create policy "class members read assignments"
  on public.assignments for select
  using (teacher_id = auth.uid() or public.is_enrolled(auth.uid(), class_id));
create policy "teacher writes assignments"
  on public.assignments for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- assignment_completions
drop policy if exists "student reads own completion"    on public.assignment_completions;
drop policy if exists "teacher reads class completions" on public.assignment_completions;
drop policy if exists "student writes own completion"   on public.assignment_completions;
drop policy if exists "teacher writes class completions" on public.assignment_completions;

create policy "student reads own completion"
  on public.assignment_completions for select using (student_id = auth.uid());
create policy "teacher reads class completions"
  on public.assignment_completions for select
  using (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
create policy "student writes own completion"
  on public.assignment_completions for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "teacher writes class completions"
  on public.assignment_completions for all
  using (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid()))
  with check (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));

-- grants for Supabase API roles ----------------------------
grant all on public.classes                to anon, authenticated;
grant all on public.class_enrollments      to anon, authenticated;
grant all on public.announcements          to anon, authenticated;
grant all on public.assignments            to anon, authenticated;
grant all on public.assignment_completions to anon, authenticated;
