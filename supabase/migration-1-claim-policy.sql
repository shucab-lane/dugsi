-- Run this once in the Supabase SQL editor.
-- Lets a teacher set themselves as teacher_id on an unowned student profile,
-- which is what makes the in-app "Add student" flow work without deploying
-- the create-student Edge Function.

drop policy if exists "teacher claims unowned students" on public.profiles;

create policy "teacher claims unowned students"
  on public.profiles for update
  using (role = 'student' and teacher_id is null and public.is_teacher(auth.uid()))
  with check (teacher_id = auth.uid());
