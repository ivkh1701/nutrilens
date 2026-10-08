-- Calorie goals: preserves full history with effective date ranges
create table if not exists public.calorie_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  calories       int  not null check (calories >= 500 and calories <= 10000),
  effective_from date not null,
  effective_to   date,             -- null means "currently active"
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- A user cannot have two overlapping open-ended goals
  constraint one_active_goal_per_user
    exclude using gist (user_id with =, daterange(effective_from, effective_to, '[)') with &&)
    where (effective_to is null)
);

create index calorie_goals_user_date_idx
  on public.calorie_goals(user_id, effective_from desc);

create trigger calorie_goals_updated_at
  before update on public.calorie_goals
  for each row execute procedure public.set_updated_at();

alter table public.calorie_goals enable row level security;

create policy "Users can view own goals"
  on public.calorie_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.calorie_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.calorie_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.calorie_goals for delete
  using (auth.uid() = user_id);
