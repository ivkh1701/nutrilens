-- Gemini analyses: raw validated AI output per meal entry
create table if not exists public.gemini_analyses (
  id             uuid primary key default gen_random_uuid(),
  meal_entry_id  uuid not null references public.meal_entries(id) on delete cascade,
  model_name     text not null,
  analysis       jsonb not null,   -- GeminiAnalysisResult schema
  analyzed_at    timestamptz not null default now()
);

create index gemini_analyses_entry_idx
  on public.gemini_analyses(meal_entry_id);

alter table public.gemini_analyses enable row level security;

create policy "Users can view own gemini analyses"
  on public.gemini_analyses for select
  using (
    exists (
      select 1 from public.meal_entries e
      where e.id = meal_entry_id and e.user_id = auth.uid()
    )
  );

-- Only the service role (Edge Function) can insert/update; users may not
-- write AI results directly from the browser.
create policy "Service role only insert"
  on public.gemini_analyses for insert
  with check (auth.role() = 'service_role');
