-- Tokens for third-party integrations (Ring, etc.)
-- Persisted here so rotations survive serverless cold starts.
create table if not exists public.integration_tokens (
  platform text primary key,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

-- Service-role only. No policies = anon/authenticated have zero access.
alter table public.integration_tokens enable row level security;
