-- Meal entries: one row per logged meal
create type public.meal_type   as enum ('Breakfast','Lunch','Dinner','Snack','Other');
create type public.meal_status as enum ('draft','confirmed');

create table if not exists public.meal_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  meal_date       date not null,
  meal_time       text not null,          -- stored as HH:MM or display string
  meal_type       meal_type not null default 'Other',
  photo_path      text,                   -- storage path, user-scoped
  total_calories  int  not null default 0 check (total_calories >= 0),
  total_carbs     int  not null default 0 check (total_carbs >= 0),
  total_protein   int  not null default 0 check (total_protein >= 0),
  total_fat       int  not null default 0 check (total_fat >= 0),
  status          meal_status not null default 'draft',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index meal_entries_user_date_idx
  on public.meal_entries(user_id, meal_date desc);

create trigger meal_entries_updated_at
  before update on public.meal_entries
  for each row execute procedure public.set_updated_at();

alter table public.meal_entries enable row level security;

create policy "Users can view own meal entries"
  on public.meal_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal entries"
  on public.meal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal entries"
  on public.meal_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own meal entries"
  on public.meal_entries for delete
  using (auth.uid() = user_id);
