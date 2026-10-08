-- Meal foods: individual food items within a meal entry
create table if not exists public.meal_foods (
  id             uuid primary key default gen_random_uuid(),
  meal_entry_id  uuid not null references public.meal_entries(id) on delete cascade,
  food_name      text not null,
  serving_qty    numeric(8,2) not null default 1 check (serving_qty > 0),
  serving_unit   text not null default 'serving',
  calories       int  not null default 0 check (calories >= 0),
  carbs          int  not null default 0 check (carbs >= 0),
  protein        int  not null default 0 check (protein >= 0),
  fat            int  not null default 0 check (fat >= 0),
  confidence     numeric(4,3) check (confidence between 0 and 1),
  created_at     timestamptz not null default now()
);

create index meal_foods_entry_idx
  on public.meal_foods(meal_entry_id);

alter table public.meal_foods enable row level security;

-- Users access meal_foods only through their own meal_entries
create policy "Users can view own meal foods"
  on public.meal_foods for select
  using (
    exists (
      select 1 from public.meal_entries e
      where e.id = meal_entry_id and e.user_id = auth.uid()
    )
  );

create policy "Users can insert own meal foods"
  on public.meal_foods for insert
  with check (
    exists (
      select 1 from public.meal_entries e
      where e.id = meal_entry_id and e.user_id = auth.uid()
    )
  );

create policy "Users can update own meal foods"
  on public.meal_foods for update
  using (
    exists (
      select 1 from public.meal_entries e
      where e.id = meal_entry_id and e.user_id = auth.uid()
    )
  );

create policy "Users can delete own meal foods"
  on public.meal_foods for delete
  using (
    exists (
      select 1 from public.meal_entries e
      where e.id = meal_entry_id and e.user_id = auth.uid()
    )
  );
