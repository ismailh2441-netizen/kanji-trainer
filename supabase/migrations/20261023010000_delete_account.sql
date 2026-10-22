-- Self-service account deletion.
-- The function can only delete the signed-in caller, because it takes no
-- arguments and uses auth.uid() from the request JWT. It runs as the database
-- owner so it can remove the row from auth.users; the progress row is removed
-- by the foreign key's on-delete-cascade.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
