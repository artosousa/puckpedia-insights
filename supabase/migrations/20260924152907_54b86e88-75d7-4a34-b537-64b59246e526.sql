create type public.organization_role as enum ('owner', 'admin', 'member');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.organization_role not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
grant select, insert, update, delete on public.organization_memberships to authenticated;
grant all on public.organization_memberships to service_role;
alter table public.organization_memberships enable row level security;

create table public.organization_branding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_path text,
  primary_color text not null default '16 78% 57%',
  secondary_color text not null default '198 72% 52%',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_branding_primary_hsl check (primary_color ~ '^[0-9]{1,3} [0-9]{1,3}% [0-9]{1,3}%$'),
  constraint organization_branding_secondary_hsl check (secondary_color ~ '^[0-9]{1,3} [0-9]{1,3}% [0-9]{1,3}%$')
);
grant select, insert, update, delete on public.organization_branding to authenticated;
grant all on public.organization_branding to service_role;
alter table public.organization_branding enable row level security;

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_role not null default 'member',
  invited_by uuid not null default auth.uid(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);
grant select, insert, update, delete on public.organization_invitations to authenticated;
grant all on public.organization_invitations to service_role;
alter table public.organization_invitations enable row level security;

alter table public.user_theme_prefs
  add column appearance_mode text not null default 'dark'
  check (appearance_mode in ('light', 'dark', 'system'));

create or replace function public.is_organization_member(_organization_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = _organization_id
      and user_id = _user_id
      and is_active
  )
$$;

create or replace function public.can_manage_organization(_organization_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = _organization_id
      and user_id = _user_id
      and role in ('owner', 'admin')
      and is_active
  )
$$;

grant execute on function public.is_organization_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_organization(uuid, uuid) to authenticated;

create policy "Members view organizations" on public.organizations
for select to authenticated using (public.is_organization_member(id));
create policy "Authenticated create organizations" on public.organizations
for insert to authenticated with check (created_by = auth.uid());
create policy "Managers update organizations" on public.organizations
for update to authenticated using (public.can_manage_organization(id)) with check (public.can_manage_organization(id));
create policy "Owners delete organizations" on public.organizations
for delete to authenticated using (
  exists (select 1 from public.organization_memberships m where m.organization_id = id and m.user_id = auth.uid() and m.role = 'owner' and m.is_active)
);

create policy "Members view memberships" on public.organization_memberships
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers add memberships" on public.organization_memberships
for insert to authenticated with check (public.can_manage_organization(organization_id));
create policy "Managers update memberships" on public.organization_memberships
for update to authenticated using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));
create policy "Managers remove memberships" on public.organization_memberships
for delete to authenticated using (public.can_manage_organization(organization_id));

create policy "Members view branding" on public.organization_branding
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers add branding" on public.organization_branding
for insert to authenticated with check (public.can_manage_organization(organization_id));
create policy "Managers update branding" on public.organization_branding
for update to authenticated using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));
create policy "Managers remove branding" on public.organization_branding
for delete to authenticated using (public.can_manage_organization(organization_id));

create policy "Members view invitations" on public.organization_invitations
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers add invitations" on public.organization_invitations
for insert to authenticated with check (public.can_manage_organization(organization_id) and invited_by = auth.uid());
create policy "Managers update invitations" on public.organization_invitations
for update to authenticated using (public.can_manage_organization(organization_id)) with check (public.can_manage_organization(organization_id));
create policy "Managers remove invitations" on public.organization_invitations
for delete to authenticated using (public.can_manage_organization(organization_id));

create or replace function public.ensure_default_organization()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  org_id uuid;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select organization_id into org_id
  from public.organization_memberships
  where user_id = uid and is_active
  order by created_at limit 1;
  if org_id is not null then return org_id; end if;

  insert into public.organizations (name, created_by)
  values ('My Scouting Team', uid)
  returning id into org_id;
  insert into public.organization_memberships (organization_id, user_id, role)
  values (org_id, uid, 'owner');
  insert into public.organization_branding (organization_id)
  values (org_id);
  return org_id;
end;
$$;
grant execute on function public.ensure_default_organization() to authenticated;

create or replace function public.claim_organization_invitations()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  account_email text;
  claimed integer := 0;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select lower(email) into account_email from auth.users where id = uid;
  with matching as (
    select id, organization_id, role
    from public.organization_invitations
    where lower(email) = account_email and accepted_at is null and expires_at > now()
  ), inserted as (
    insert into public.organization_memberships (organization_id, user_id, role)
    select organization_id, uid, role from matching
    on conflict (organization_id, user_id) do nothing
    returning organization_id
  )
  update public.organization_invitations i
  set accepted_at = now(), updated_at = now()
  where i.id in (select id from matching);
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;
grant execute on function public.claim_organization_invitations() to authenticated;

create trigger organizations_updated_at before update on public.organizations
for each row execute function public.update_updated_at_column();
create trigger organization_memberships_updated_at before update on public.organization_memberships
for each row execute function public.update_updated_at_column();
create trigger organization_branding_updated_at before update on public.organization_branding
for each row execute function public.update_updated_at_column();
create trigger organization_invitations_updated_at before update on public.organization_invitations
for each row execute function public.update_updated_at_column();

create policy "Team members view logos" on storage.objects
for select to authenticated using (
  bucket_id = 'team-branding'
  and public.is_organization_member(((storage.foldername(name))[1])::uuid)
);
create policy "Team managers upload logos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'team-branding'
  and public.can_manage_organization(((storage.foldername(name))[1])::uuid)
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
);
create policy "Team managers update logos" on storage.objects
for update to authenticated using (
  bucket_id = 'team-branding'
  and public.can_manage_organization(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'team-branding'
  and public.can_manage_organization(((storage.foldername(name))[1])::uuid)
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
);
create policy "Team managers delete logos" on storage.objects
for delete to authenticated using (
  bucket_id = 'team-branding'
  and public.can_manage_organization(((storage.foldername(name))[1])::uuid)
);