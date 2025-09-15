-- Create allowed_users table for access allowlist
create table public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'user',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.allowed_users enable row level security;

-- Policy: Authenticated users can only read their own allowlist record
create policy "Users can read their own allowlist record" 
  on public.allowed_users
  for select
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));