create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

revoke all on public.progress from anon;
grant select, insert, update, delete on public.progress to authenticated;

drop policy if exists "Users can read own progress" on public.progress;
create policy "Users can read own progress"
  on public.progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own progress" on public.progress;
create policy "Users can insert own progress"
  on public.progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own progress" on public.progress;
create policy "Users can update own progress"
  on public.progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own progress" on public.progress;
create policy "Users can delete own progress"
  on public.progress for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_progress_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists progress_set_updated_at on public.progress;
create trigger progress_set_updated_at
  before update on public.progress
  for each row execute function public.set_progress_updated_at();
