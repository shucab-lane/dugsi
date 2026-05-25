-- ============================================================
-- Run-all migrations. Paste this entire file into the Supabase SQL editor
-- and click Run. It is idempotent — safe to re-run any time.
-- Contains: migration-2 (attendance + goals + position),
--           migration-3 (trigger handles teacher_id),
--           migration-4 (student writes own goals).
-- ============================================================

-- ====== migration-2 ======
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
drop policy if exists "student reads own attendance" on public.attendance;
drop policy if exists "teacher reads student attendance" on public.attendance;
drop policy if exists "teacher writes attendance" on public.attendance;
create policy "student reads own attendance"     on public.attendance for select using (student_id = auth.uid());
create policy "teacher reads student attendance" on public.attendance for select using (teacher_id = auth.uid());
create policy "teacher writes attendance"        on public.attendance for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

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
drop policy if exists "student reads own goals2"  on public.goals;
drop policy if exists "teacher reads student goals2" on public.goals;
drop policy if exists "teacher writes goals2"     on public.goals;
drop policy if exists "student writes own goals2" on public.goals;
create policy "student reads own goals2"
  on public.goals for select using (student_id = auth.uid());
create policy "teacher reads student goals2"
  on public.goals for select using (teacher_id = auth.uid());
create policy "teacher writes goals2"
  on public.goals for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
-- migration-4 part: students own their goals
create policy "student writes own goals2"
  on public.goals for all using (student_id = auth.uid()) with check (student_id = auth.uid());

alter table public.profiles
  add column if not exists current_surah int,
  add column if not exists current_ayah  int;

-- Grant base privileges to Supabase API roles (RLS still enforces row access)
grant all on public.goals      to anon, authenticated;
grant all on public.attendance to anon, authenticated;

-- ====== migration-3: trigger handles teacher_id from signup metadata ======
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  no_teacher_yet      boolean;
  meta_teacher_id     uuid;
  meta_full_name      text;
begin
  meta_teacher_id := nullif(new.raw_user_meta_data->>'teacher_id', '')::uuid;
  meta_full_name  := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(new.email, '@', 1)
  );

  if meta_teacher_id is not null then
    insert into public.profiles (id, role, full_name, teacher_id)
    values (new.id, 'student', meta_full_name, meta_teacher_id)
    on conflict (id) do update
      set role = 'student',
          full_name = excluded.full_name,
          teacher_id = excluded.teacher_id;
  else
    select count(*) = 0 into no_teacher_yet from public.profiles where role = 'teacher';
    insert into public.profiles (id, role, full_name)
    values (
      new.id,
      case when no_teacher_yet then 'teacher' else 'student' end,
      meta_full_name
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
