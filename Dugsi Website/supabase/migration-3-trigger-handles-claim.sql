-- ============================================================
-- migration-3: make the auth signup trigger handle teacher_id directly.
-- When a teacher signs up a student, the client passes the teacher's UUID in
-- raw_user_meta_data.teacher_id. The trigger reads it and creates the profile
-- with role='student' and the correct teacher_id in one atomic step.
--
-- After this, the separate "claim" UPDATE in the client is no longer needed
-- (but it's harmless to keep around as a safety net).
-- ============================================================

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
    -- Created by a teacher: student belongs to that teacher.
    insert into public.profiles (id, role, full_name, teacher_id)
    values (new.id, 'student', meta_full_name, meta_teacher_id)
    on conflict (id) do update
      set role = 'student',
          full_name = excluded.full_name,
          teacher_id = excluded.teacher_id;
  else
    -- Self signup: first user becomes the teacher, everyone else a student.
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

-- Trigger itself doesn't change, but recreate it to be safe.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
