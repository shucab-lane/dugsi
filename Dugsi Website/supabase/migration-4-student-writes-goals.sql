-- ============================================================
-- migration-4: let students write their own goals.
-- Until now only the teacher could insert/update rows in `goals`. Students
-- now own their goals; the teacher still reads them.
-- Safe to re-run.
-- ============================================================

drop policy if exists "student writes own goals2" on public.goals;

create policy "student writes own goals2"
  on public.goals for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
