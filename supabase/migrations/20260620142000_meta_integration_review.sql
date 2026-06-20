create table if not exists public.meta_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  product text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received',
  error_message text
);

create index if not exists idx_meta_webhook_events_product_received
  on public.meta_webhook_events(product, received_at desc);

create table if not exists public.meta_review_test_runs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  mode text not null,
  ok boolean not null default false,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_meta_review_test_runs_action_created
  on public.meta_review_test_runs(action, created_at desc);

alter table public.meta_webhook_events enable row level security;
alter table public.meta_review_test_runs enable row level security;

create policy if not exists "Service role manages meta webhook events"
  on public.meta_webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Authenticated users can read meta webhook events"
  on public.meta_webhook_events
  for select
  using (auth.role() = 'authenticated');

create policy if not exists "Service role manages meta review test runs"
  on public.meta_review_test_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy if not exists "Authenticated users can read meta review test runs"
  on public.meta_review_test_runs
  for select
  using (auth.role() = 'authenticated');
