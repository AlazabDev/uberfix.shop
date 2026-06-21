alter table public.meta_webhook_events
  add column if not exists object_type text,
  add column if not exists field_name text,
  add column if not exists entry_id text,
  add column if not exists event_id text,
  add column if not exists event_type text,
  add column if not exists source_id text,
  add column if not exists normalized jsonb not null default '{}'::jsonb,
  add column if not exists signature_valid boolean not null default false,
  add column if not exists headers jsonb not null default '{}'::jsonb;

create unique index if not exists idx_meta_webhook_events_event_id_unique
  on public.meta_webhook_events(event_id)
  where event_id is not null;

create index if not exists idx_meta_webhook_events_object_field_received
  on public.meta_webhook_events(object_type, field_name, received_at desc);

create index if not exists idx_meta_webhook_events_event_type_received
  on public.meta_webhook_events(event_type, received_at desc);

create index if not exists idx_meta_webhook_events_source_received
  on public.meta_webhook_events(source_id, received_at desc);
