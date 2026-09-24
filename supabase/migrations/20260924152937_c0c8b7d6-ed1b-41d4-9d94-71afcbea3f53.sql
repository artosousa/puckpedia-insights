create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_organization_member(_organization_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = _organization_id and user_id = _user_id and is_active
  )
$$;
revoke all on function private.is_organization_member(uuid, uuid) from public, anon;
grant execute on function private.is_organization_member(uuid, uuid) to authenticated, service_role;

create or replace function private.can_manage_organization(_organization_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = _organization_id and user_id = _user_id and role in ('owner', 'admin') and is_active
  )
$$;
revoke all on function private.can_manage_organization(uuid, uuid) from public, anon;
grant execute on function private.can_manage_organization(uuid, uuid) to authenticated, service_role;

alter function public.is_organization_member(uuid, uuid) security invoker;
alter function public.can_manage_organization(uuid, uuid) security invoker;
create or replace function public.is_organization_member(_organization_id uuid, _user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path = public, private
as $$ select private.is_organization_member(_organization_id, _user_id) $$;
create or replace function public.can_manage_organization(_organization_id uuid, _user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path = public, private
as $$ select private.can_manage_organization(_organization_id, _user_id) $$;
revoke all on function public.is_organization_member(uuid, uuid) from public, anon;
revoke all on function public.can_manage_organization(uuid, uuid) from public, anon;
grant execute on function public.is_organization_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_organization(uuid, uuid) to authenticated;

create or replace function private.ensure_default_organization(_user_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare org_id uuid;
begin
  select organization_id into org_id from public.organization_memberships
  where user_id = _user_id and is_active order by created_at limit 1;
  if org_id is not null then return org_id; end if;
  insert into public.organizations (name, created_by) values ('My Scouting Team', _user_id) returning id into org_id;
  insert into public.organization_memberships (organization_id, user_id, role) values (org_id, _user_id, 'owner');
  insert into public.organization_branding (organization_id) values (org_id);
  return org_id;
end;
$$;
revoke all on function private.ensure_default_organization(uuid) from public, anon;
grant execute on function private.ensure_default_organization(uuid) to authenticated, service_role;

alter function public.ensure_default_organization() security invoker;
create or replace function public.ensure_default_organization()
returns uuid language sql security invoker set search_path = public, private
as $$ select private.ensure_default_organization(auth.uid()) $$;
revoke all on function public.ensure_default_organization() from public, anon;
grant execute on function public.ensure_default_organization() to authenticated;

create or replace function private.claim_organization_invitations(_user_id uuid)
returns integer language plpgsql security definer set search_path = public, auth
as $$
declare account_email text; claimed integer := 0;
begin
  select lower(email) into account_email from auth.users where id = _user_id;
  with matching as (
    select id, organization_id, role from public.organization_invitations
    where lower(email) = account_email and accepted_at is null and expires_at > now()
  ), inserted as (
    insert into public.organization_memberships (organization_id, user_id, role)
    select organization_id, _user_id, role from matching
    on conflict (organization_id, user_id) do nothing returning organization_id
  )
  update public.organization_invitations i set accepted_at = now(), updated_at = now()
  where i.id in (select id from matching);
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;
revoke all on function private.claim_organization_invitations(uuid) from public, anon;
grant execute on function private.claim_organization_invitations(uuid) to authenticated, service_role;

alter function public.claim_organization_invitations() security invoker;
create or replace function public.claim_organization_invitations()
returns integer language sql security invoker set search_path = public, private
as $$ select private.claim_organization_invitations(auth.uid()) $$;
revoke all on function public.claim_organization_invitations() from public, anon;
grant execute on function public.claim_organization_invitations() to authenticated;

alter policy "Members view organizations" on public.organizations using (private.is_organization_member(id, auth.uid()));
alter policy "Managers update organizations" on public.organizations using (private.can_manage_organization(id, auth.uid())) with check (private.can_manage_organization(id, auth.uid()));
alter policy "Members view memberships" on public.organization_memberships using (private.is_organization_member(organization_id, auth.uid()));
alter policy "Managers add memberships" on public.organization_memberships with check (private.can_manage_organization(organization_id, auth.uid()));
alter policy "Managers update memberships" on public.organization_memberships using (private.can_manage_organization(organization_id, auth.uid())) with check (private.can_manage_organization(organization_id, auth.uid()));
alter policy "Managers remove memberships" on public.organization_memberships using (private.can_manage_organization(organization_id, auth.uid()));
alter policy "Members view branding" on public.organization_branding using (private.is_organization_member(organization_id, auth.uid()));
alter policy "Managers add branding" on public.organization_branding with check (private.can_manage_organization(organization_id, auth.uid()));
alter policy "Managers update branding" on public.organization_branding using (private.can_manage_organization(organization_id, auth.uid())) with check (private.can_manage_organization(organization_id, auth.uid()));
alter policy "Managers remove branding" on public.organization_branding using (private.can_manage_organization(organization_id, auth.uid()));
alter policy "Members view invitations" on public.organization_invitations using (private.is_organization_member(organization_id, auth.uid()));
alter policy "Managers add invitations" on public.organization_invitations with check (private.can_manage_organization(organization_id, auth.uid()) and invited_by = auth.uid());
alter policy "Managers update invitations" on public.organization_invitations using (private.can_manage_organization(organization_id, auth.uid())) with check (private.can_manage_organization(organization_id, auth.uid()));
alter policy "Managers remove invitations" on public.organization_invitations using (private.can_manage_organization(organization_id, auth.uid()));

alter policy "Team members view logos" on storage.objects using (bucket_id = 'team-branding' and private.is_organization_member(((storage.foldername(name))[1])::uuid, auth.uid()));
alter policy "Team managers upload logos" on storage.objects with check (bucket_id = 'team-branding' and private.can_manage_organization(((storage.foldername(name))[1])::uuid, auth.uid()) and lower(storage.extension(name)) in ('png','jpg','jpeg','webp'));
alter policy "Team managers update logos" on storage.objects using (bucket_id = 'team-branding' and private.can_manage_organization(((storage.foldername(name))[1])::uuid, auth.uid())) with check (bucket_id = 'team-branding' and private.can_manage_organization(((storage.foldername(name))[1])::uuid, auth.uid()) and lower(storage.extension(name)) in ('png','jpg','jpeg','webp'));
alter policy "Team managers delete logos" on storage.objects using (bucket_id = 'team-branding' and private.can_manage_organization(((storage.foldername(name))[1])::uuid, auth.uid()));