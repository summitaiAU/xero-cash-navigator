-- Invoice locks table for hard locking
create table public.invoice_locks (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  locked_by_user_id uuid not null,
  locked_by_email text not null,
  locked_at timestamp with time zone not null default now(),
  lock_expires_at timestamp with time zone not null default (now() + interval '15 minutes'),
  force_taken boolean default false,
  force_reason text,
  unique(invoice_id)
);

-- RLS policies
alter table public.invoice_locks enable row level security;

-- Allow authenticated users to read locks
create policy "Authenticated users can read locks"
on public.invoice_locks for select
to authenticated
using (true);

-- Allow users to create locks for themselves
create policy "Users can create their own locks"
on public.invoice_locks for insert
to authenticated
with check (locked_by_user_id = auth.uid());

-- Allow users to delete their own locks
create policy "Users can delete their own locks"
on public.invoice_locks for delete
to authenticated
using (locked_by_user_id = auth.uid());

-- Admins can force-take locks (update)
create policy "Admins can force take locks"
on public.invoice_locks for update
to authenticated
using (
  exists (
    select 1 from allowed_users
    where email = (auth.jwt() ->> 'email'::text)
    and role = 'admin'
    and active = true
  )
);

-- Function to clean up expired locks automatically
create or replace function cleanup_expired_locks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from invoice_locks where lock_expires_at < now();
end;
$$;

-- Trigger to auto-cleanup on lock access
create or replace function check_and_cleanup_expired_locks()
returns trigger
language plpgsql
as $$
begin
  perform cleanup_expired_locks();
  return new;
end;
$$;

create trigger cleanup_locks_trigger
before insert on invoice_locks
for each statement
execute function check_and_cleanup_expired_locks();

-- Enable realtime for locks table
alter publication supabase_realtime add table invoice_locks;

-- Indexes for performance
create index idx_invoice_locks_invoice_id on invoice_locks(invoice_id);
create index idx_invoice_locks_expires on invoice_locks(lock_expires_at);