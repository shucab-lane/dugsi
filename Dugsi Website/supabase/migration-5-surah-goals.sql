-- ============================================================
-- migration-5: add surah-list goals.
-- Weekly goals stay ayah-based; monthly / 6-month / annual goals become
-- surah-checklist based. We store both pieces on every row so a weekly goal
-- can still optionally list surahs.
-- Safe to re-run.
-- ============================================================

alter table public.goals
  add column if not exists target_surahs    int[] not null default '{}',
  add column if not exists completed_surahs int[] not null default '{}';

-- Make sure the API roles still have full access (no-op if already granted).
grant all on public.goals to anon, authenticated;
