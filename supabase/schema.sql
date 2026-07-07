-- GC — Gerenciador de Comunidade Profissional
-- Execute este arquivo no SQL Editor do Supabase.
-- Ele cria tabelas, funções, políticas RLS, bucket de avatar e realtime para mensagens.

create extension if not exists pgcrypto;

-- =========================
-- TABELAS PRINCIPAIS
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  color text not null default '#ff7a1a',
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid references public.roles(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  scope text not null default 'general' check (scope in ('general', 'role', 'group', 'custom')),
  target_role_id uuid references public.roles(id) on delete cascade,
  target_group_id uuid references public.groups(id) on delete cascade,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(chat_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  event_at timestamptz not null,
  scope text not null default 'general' check (scope in ('general', 'role', 'group', 'custom')),
  target_role_id uuid references public.roles(id) on delete cascade,
  target_group_id uuid references public.groups(id) on delete cascade,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_targets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_roles_team on public.roles(team_id);
create index if not exists idx_groups_team on public.groups(team_id);
create index if not exists idx_chats_team on public.chats(team_id);
create index if not exists idx_messages_chat on public.messages(chat_id);
create index if not exists idx_messages_team on public.messages(team_id);
create index if not exists idx_events_team on public.events(team_id);

-- =========================
-- FUNÇÕES AUXILIARES
-- =========================

create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select 'GC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1), 'Usuário'),
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1), 'usuario')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_message_team_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select team_id into new.team_id from public.chats where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_team on public.messages;
create trigger trg_messages_team
  before insert on public.messages
  for each row execute function public.set_message_team_id();

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_teams_touch on public.teams;
create trigger trg_teams_touch before update on public.teams
for each row execute function public.touch_updated_at();

drop trigger if exists trg_roles_touch on public.roles;
create trigger trg_roles_touch before update on public.roles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_groups_touch on public.groups;
create trigger trg_groups_touch before update on public.groups
for each row execute function public.touch_updated_at();

drop trigger if exists trg_chats_touch on public.chats;
create trigger trg_chats_touch before update on public.chats
for each row execute function public.touch_updated_at();

drop trigger if exists trg_events_touch on public.events;
create trigger trg_events_touch before update on public.events
for each row execute function public.touch_updated_at();

drop trigger if exists trg_announcements_touch on public.announcements;
create trigger trg_announcements_touch before update on public.announcements
for each row execute function public.touch_updated_at();

create or replace function public.is_team_member(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
  );
$$;

create or replace function public.has_team_permission(target_team_id uuid, permission_name text, target_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    return false;
  end if;

  if exists (
    select 1 from public.teams t
    where t.id = target_team_id and t.owner_id = target_user_id
  ) then
    return true;
  end if;

  return exists (
    select 1
    from public.team_members tm
    join public.roles r on r.id = tm.role_id
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
      and permission_name = any(r.permissions)
  );
end;
$$;

create or replace function public.can_access_chat(target_chat_id uuid, target_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.chats%rowtype;
begin
  select * into c from public.chats where id = target_chat_id;

  if c.id is null or target_user_id is null then
    return false;
  end if;

  if public.has_team_permission(c.team_id, 'manageChats', target_user_id) then
    return true;
  end if;

  if not public.is_team_member(c.team_id, target_user_id) then
    return false;
  end if;

  if c.created_by = target_user_id then
    return true;
  end if;

  if c.scope = 'general' then
    return true;
  end if;

  if c.scope = 'role' then
    return exists (
      select 1 from public.team_members tm
      where tm.team_id = c.team_id
        and tm.user_id = target_user_id
        and tm.role_id = c.target_role_id
    );
  end if;

  if c.scope = 'group' then
    return exists (
      select 1
      from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where g.team_id = c.team_id
        and gm.group_id = c.target_group_id
        and gm.user_id = target_user_id
    );
  end if;

  if c.scope = 'custom' then
    return exists (
      select 1 from public.chat_members cm
      where cm.chat_id = c.id
        and cm.user_id = target_user_id
    );
  end if;

  return false;
end;
$$;

create or replace function public.can_access_event(target_event_id uuid, target_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
begin
  select * into e from public.events where id = target_event_id;

  if e.id is null or target_user_id is null then
    return false;
  end if;

  if public.has_team_permission(e.team_id, 'manageEvents', target_user_id) then
    return true;
  end if;

  if not public.is_team_member(e.team_id, target_user_id) then
    return false;
  end if;

  if e.scope = 'general' then
    return true;
  end if;

  if e.scope = 'role' then
    return exists (
      select 1 from public.team_members tm
      where tm.team_id = e.team_id
        and tm.user_id = target_user_id
        and tm.role_id = e.target_role_id
    );
  end if;

  if e.scope = 'group' then
    return exists (
      select 1
      from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where g.team_id = e.team_id
        and gm.group_id = e.target_group_id
        and gm.user_id = target_user_id
    );
  end if;

  if e.scope = 'custom' then
    return exists (
      select 1 from public.event_targets et
      where et.event_id = e.id
        and et.user_id = target_user_id
    );
  end if;

  return false;
end;
$$;

-- =========================
-- RPCS DO SISTEMA
-- =========================

create or replace function public.create_team_with_defaults(team_name text, team_description text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_team_id uuid;
  admin_role_id uuid;
  member_role_id uuid;
  code text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  code := public.generate_invite_code();

  insert into public.teams (name, description, invite_code, owner_id)
  values (team_name, team_description, code, auth.uid())
  returning id into new_team_id;

  insert into public.roles (team_id, name, color, permissions)
  values (
    new_team_id,
    'Administrador',
    '#ff7a1a',
    array['manageMembers','manageRoles','manageGroups','manageChats','manageEvents','manageAnnouncements','manageInvites']
  )
  returning id into admin_role_id;

  insert into public.roles (team_id, name, color, permissions)
  values (new_team_id, 'Membro', '#8a94a6', '{}')
  returning id into member_role_id;

  insert into public.team_members (team_id, user_id, role_id)
  values (new_team_id, auth.uid(), admin_role_id);

  insert into public.chats (team_id, name, scope, created_by)
  values (new_team_id, 'Chat geral', 'general', auth.uid());

  insert into public.announcements (team_id, title, body, created_by)
  values (
    new_team_id,
    'Bem-vindo ao GC',
    'Sua equipe foi criada. Agora você pode convidar membros, criar cargos, grupos, chats e eventos.',
    auth.uid()
  );

  return new_team_id;
end;
$$;

create or replace function public.join_team_by_code(join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_team public.teams%rowtype;
  default_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select * into found_team
  from public.teams
  where upper(invite_code) = upper(trim(join_code))
  limit 1;

  if found_team.id is null then
    raise exception 'Equipe não encontrada.';
  end if;

  if exists (
    select 1 from public.team_members
    where team_id = found_team.id and user_id = auth.uid()
  ) then
    return found_team.id;
  end if;

  select id into default_role_id
  from public.roles
  where team_id = found_team.id and lower(name) = 'membro'
  limit 1;

  if default_role_id is null then
    select id into default_role_id
    from public.roles
    where team_id = found_team.id
    order by created_at asc
    limit 1;
  end if;

  insert into public.team_members (team_id, user_id, role_id)
  values (found_team.id, auth.uid(), default_role_id);

  return found_team.id;
end;
$$;

-- =========================
-- RLS
-- =========================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.roles enable row level security;
alter table public.team_members enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;
alter table public.event_targets enable row level security;
alter table public.announcements enable row level security;

-- Profiles

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Teams

drop policy if exists "teams_select_members" on public.teams;
create policy "teams_select_members"
on public.teams for select
to authenticated
using (public.is_team_member(id, auth.uid()));

drop policy if exists "teams_update_managers" on public.teams;
create policy "teams_update_managers"
on public.teams for update
to authenticated
using (public.has_team_permission(id, 'manageInvites', auth.uid()))
with check (public.has_team_permission(id, 'manageInvites', auth.uid()));

-- Roles

drop policy if exists "roles_select_members" on public.roles;
create policy "roles_select_members"
on public.roles for select
to authenticated
using (public.is_team_member(team_id, auth.uid()));

drop policy if exists "roles_insert_managers" on public.roles;
create policy "roles_insert_managers"
on public.roles for insert
to authenticated
with check (public.has_team_permission(team_id, 'manageRoles', auth.uid()));

drop policy if exists "roles_update_managers" on public.roles;
create policy "roles_update_managers"
on public.roles for update
to authenticated
using (public.has_team_permission(team_id, 'manageRoles', auth.uid()))
with check (public.has_team_permission(team_id, 'manageRoles', auth.uid()));

drop policy if exists "roles_delete_managers" on public.roles;
create policy "roles_delete_managers"
on public.roles for delete
to authenticated
using (public.has_team_permission(team_id, 'manageRoles', auth.uid()));

-- Team members

drop policy if exists "team_members_select_team" on public.team_members;
create policy "team_members_select_team"
on public.team_members for select
to authenticated
using (public.is_team_member(team_id, auth.uid()));

drop policy if exists "team_members_update_managers" on public.team_members;
create policy "team_members_update_managers"
on public.team_members for update
to authenticated
using (public.has_team_permission(team_id, 'manageMembers', auth.uid()))
with check (public.has_team_permission(team_id, 'manageMembers', auth.uid()));

drop policy if exists "team_members_delete_managers" on public.team_members;
create policy "team_members_delete_managers"
on public.team_members for delete
to authenticated
using (public.has_team_permission(team_id, 'manageMembers', auth.uid()) and user_id <> auth.uid());

-- Groups

drop policy if exists "groups_select_members" on public.groups;
create policy "groups_select_members"
on public.groups for select
to authenticated
using (public.is_team_member(team_id, auth.uid()));

drop policy if exists "groups_insert_managers" on public.groups;
create policy "groups_insert_managers"
on public.groups for insert
to authenticated
with check (public.has_team_permission(team_id, 'manageGroups', auth.uid()));

drop policy if exists "groups_update_managers" on public.groups;
create policy "groups_update_managers"
on public.groups for update
to authenticated
using (public.has_team_permission(team_id, 'manageGroups', auth.uid()))
with check (public.has_team_permission(team_id, 'manageGroups', auth.uid()));

drop policy if exists "groups_delete_managers" on public.groups;
create policy "groups_delete_managers"
on public.groups for delete
to authenticated
using (public.has_team_permission(team_id, 'manageGroups', auth.uid()));

-- Group members

drop policy if exists "group_members_select_team" on public.group_members;
create policy "group_members_select_team"
on public.group_members for select
to authenticated
using (
  exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and public.is_team_member(g.team_id, auth.uid())
  )
);

drop policy if exists "group_members_insert_managers" on public.group_members;
create policy "group_members_insert_managers"
on public.group_members for insert
to authenticated
with check (
  exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and public.has_team_permission(g.team_id, 'manageGroups', auth.uid())
  )
);

drop policy if exists "group_members_delete_managers" on public.group_members;
create policy "group_members_delete_managers"
on public.group_members for delete
to authenticated
using (
  exists (
    select 1 from public.groups g
    where g.id = group_members.group_id
      and public.has_team_permission(g.team_id, 'manageGroups', auth.uid())
  )
);

-- Chats

drop policy if exists "chats_select_allowed" on public.chats;
create policy "chats_select_allowed"
on public.chats for select
to authenticated
using (public.can_access_chat(id, auth.uid()));

drop policy if exists "chats_insert_members" on public.chats;
create policy "chats_insert_members"
on public.chats for insert
to authenticated
with check (public.is_team_member(team_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "chats_update_creator_or_manager" on public.chats;
create policy "chats_update_creator_or_manager"
on public.chats for update
to authenticated
using (created_by = auth.uid() or public.has_team_permission(team_id, 'manageChats', auth.uid()))
with check (created_by = auth.uid() or public.has_team_permission(team_id, 'manageChats', auth.uid()));

drop policy if exists "chats_delete_creator_or_manager" on public.chats;
create policy "chats_delete_creator_or_manager"
on public.chats for delete
to authenticated
using (scope <> 'general' and (created_by = auth.uid() or public.has_team_permission(team_id, 'manageChats', auth.uid())));

-- Chat members

drop policy if exists "chat_members_select_allowed" on public.chat_members;
create policy "chat_members_select_allowed"
on public.chat_members for select
to authenticated
using (public.can_access_chat(chat_id, auth.uid()));

drop policy if exists "chat_members_insert_creator_or_manager" on public.chat_members;
create policy "chat_members_insert_creator_or_manager"
on public.chat_members for insert
to authenticated
with check (
  exists (
    select 1 from public.chats c
    where c.id = chat_members.chat_id
      and public.is_team_member(c.team_id, chat_members.user_id)
      and (c.created_by = auth.uid() or public.has_team_permission(c.team_id, 'manageChats', auth.uid()))
  )
);

drop policy if exists "chat_members_delete_creator_or_manager" on public.chat_members;
create policy "chat_members_delete_creator_or_manager"
on public.chat_members for delete
to authenticated
using (
  exists (
    select 1 from public.chats c
    where c.id = chat_members.chat_id
      and (c.created_by = auth.uid() or public.has_team_permission(c.team_id, 'manageChats', auth.uid()))
  )
);

-- Messages

drop policy if exists "messages_select_allowed" on public.messages;
create policy "messages_select_allowed"
on public.messages for select
to authenticated
using (public.can_access_chat(chat_id, auth.uid()));

drop policy if exists "messages_insert_allowed" on public.messages;
create policy "messages_insert_allowed"
on public.messages for insert
to authenticated
with check (user_id = auth.uid() and public.can_access_chat(chat_id, auth.uid()));

drop policy if exists "messages_delete_own_or_manager" on public.messages;
create policy "messages_delete_own_or_manager"
on public.messages for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.chats c
    where c.id = messages.chat_id
      and public.has_team_permission(c.team_id, 'manageChats', auth.uid())
  )
);

-- Events

drop policy if exists "events_select_allowed" on public.events;
create policy "events_select_allowed"
on public.events for select
to authenticated
using (public.can_access_event(id, auth.uid()));

drop policy if exists "events_insert_managers" on public.events;
create policy "events_insert_managers"
on public.events for insert
to authenticated
with check (public.has_team_permission(team_id, 'manageEvents', auth.uid()));

drop policy if exists "events_update_managers" on public.events;
create policy "events_update_managers"
on public.events for update
to authenticated
using (public.has_team_permission(team_id, 'manageEvents', auth.uid()))
with check (public.has_team_permission(team_id, 'manageEvents', auth.uid()));

drop policy if exists "events_delete_managers" on public.events;
create policy "events_delete_managers"
on public.events for delete
to authenticated
using (public.has_team_permission(team_id, 'manageEvents', auth.uid()));

-- Event targets

drop policy if exists "event_targets_select_allowed" on public.event_targets;
create policy "event_targets_select_allowed"
on public.event_targets for select
to authenticated
using (public.can_access_event(event_id, auth.uid()));

drop policy if exists "event_targets_insert_managers" on public.event_targets;
create policy "event_targets_insert_managers"
on public.event_targets for insert
to authenticated
with check (
  exists (
    select 1 from public.events e
    where e.id = event_targets.event_id
      and public.has_team_permission(e.team_id, 'manageEvents', auth.uid())
  )
);

drop policy if exists "event_targets_delete_managers" on public.event_targets;
create policy "event_targets_delete_managers"
on public.event_targets for delete
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_targets.event_id
      and public.has_team_permission(e.team_id, 'manageEvents', auth.uid())
  )
);

-- Announcements

drop policy if exists "announcements_select_members" on public.announcements;
create policy "announcements_select_members"
on public.announcements for select
to authenticated
using (public.is_team_member(team_id, auth.uid()));

drop policy if exists "announcements_insert_managers" on public.announcements;
create policy "announcements_insert_managers"
on public.announcements for insert
to authenticated
with check (public.has_team_permission(team_id, 'manageAnnouncements', auth.uid()));

drop policy if exists "announcements_update_managers" on public.announcements;
create policy "announcements_update_managers"
on public.announcements for update
to authenticated
using (public.has_team_permission(team_id, 'manageAnnouncements', auth.uid()))
with check (public.has_team_permission(team_id, 'manageAnnouncements', auth.uid()));

drop policy if exists "announcements_delete_managers" on public.announcements;
create policy "announcements_delete_managers"
on public.announcements for delete
to authenticated
using (public.has_team_permission(team_id, 'manageAnnouncements', auth.uid()));

-- =========================
-- STORAGE PARA FOTO DE PERFIL
-- =========================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars_public_select" on storage.objects;
create policy "avatars_public_select"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- =========================
-- REALTIME
-- =========================

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end;
$$;
