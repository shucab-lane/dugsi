-- ============================================================
-- migration-7: let monthly / 6-month / annual goals include whole juz,
-- not just individual surahs. Students with bigger goals can pick "Juz 30"
-- as one tickable item instead of adding 11 surahs by hand.
-- Safe to re-run.
-- ============================================================

alter table public.goals
  add column if not exists target_juz    int[] not null default '{}',
  add column if not exists completed_juz int[] not null default '{}';

-- Make sure the API roles still have full access (no-op if already granted).
grant all on public.goals to anon, authenticated;

notify pgrst, 'reload schema';
