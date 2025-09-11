-- Auto-assign superadmin role when the specified email user is created
create or replace function public.assign_role_on_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email = 'superadmin@twindataminds.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'superadmin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

-- Recreate trigger safely
drop trigger if exists on_auth_user_created_assign_role on auth.users;
create trigger on_auth_user_created_assign_role
  after insert on auth.users
  for each row execute procedure public.assign_role_on_user_created();