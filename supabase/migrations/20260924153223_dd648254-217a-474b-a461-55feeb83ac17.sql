create or replace function private.claim_organization_invitations(_user_id uuid)
returns integer language plpgsql security definer set search_path = public, auth
as $$
declare account_email text; claimed integer := 0;
begin
  select lower(email) into account_email from auth.users where id = _user_id;
  if exists (
    select 1 from public.organization_invitations
    where lower(email) = account_email and accepted_at is null and expires_at > now()
  ) then
    update public.organization_memberships set is_active = false where user_id = _user_id;
    insert into public.organization_memberships (organization_id, user_id, role, is_active)
    select organization_id, _user_id, role, true
    from public.organization_invitations
    where lower(email) = account_email and accepted_at is null and expires_at > now()
    on conflict (organization_id, user_id) do update set role = excluded.role, is_active = true;
    update public.organization_invitations
    set accepted_at = now(), updated_at = now()
    where lower(email) = account_email and accepted_at is null and expires_at > now();
    get diagnostics claimed = row_count;
  end if;
  return claimed;
end;
$$;