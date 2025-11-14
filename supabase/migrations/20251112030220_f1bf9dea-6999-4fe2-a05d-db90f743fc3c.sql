-- Fix trigger function to have proper search_path
create or replace function check_and_cleanup_expired_locks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform cleanup_expired_locks();
  return new;
end;
$$;