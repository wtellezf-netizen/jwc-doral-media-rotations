-- JWC Doral · Media Rotations
-- Schema for recurring services, team rotations, confirmations, and replacements.

create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'editor', 'member');
create type public.service_kind as enum ('youngs', 'friday', 'sunday_10', 'sunday_1215', 'special');
create type public.assignment_status as enum ('pending', 'accepted', 'declined', 'replaced');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'member',
  phone text,
  email_reminders boolean not null default true,
  whatsapp_reminders boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text,
  service_kind public.service_kind,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  position_id uuid not null references public.positions(id) on delete restrict,
  priority integer not null default 0,
  active boolean not null default true,
  unique (team_id, position_id, profile_id)
);

create table public.service_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_kind public.service_kind not null,
  weekday integer,
  week_numbers integer[],
  start_time time not null,
  timezone text not null default 'America/New_York',
  rotation_group text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  service_kind public.service_kind not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  team_id uuid references public.teams(id) on delete set null,
  generated_by_rule_id uuid references public.service_rules(id) on delete set null,
  is_published boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  status public.assignment_status not null default 'pending',
  assigned_by uuid references public.profiles(id) on delete set null,
  replacement_for uuid references public.assignments(id) on delete set null,
  responded_at timestamptz,
  reminder_7d_sent_at timestamptz,
  reminder_24h_sent_at timestamptz,
  unique (service_id, position_id)
);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create index services_starts_at_idx on public.services(starts_at);
create index assignments_profile_id_idx on public.assignments(profile_id);
create index assignments_service_id_idx on public.assignments(service_id);
create index team_members_team_id_idx on public.team_members(team_id);

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.positions enable row level security;
alter table public.team_members enable row level security;
alter table public.service_rules enable row level security;
alter table public.services enable row level security;
alter table public.assignments enable row level security;
alter table public.availability_blocks enable row level security;

-- Public visitors can read the published agenda and team names. Personal contact data remains private.
create policy "published services are public" on public.services for select using (is_published = true);
create policy "public teams are readable" on public.teams for select using (active = true);
create policy "public positions are readable" on public.positions for select using (active = true);
create policy "published assignments are public" on public.assignments for select using (exists (select 1 from public.services s where s.id = service_id and s.is_published = true));

create policy "members can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "members can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "members can read own assignments" on public.assignments for select using (profile_id = auth.uid());
create policy "members can respond to own assignments" on public.assignments for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "members can manage own availability" on public.availability_blocks for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Editors and admins can manage scheduling data. The profile rows must be created from Supabase Auth first.
create policy "editors manage teams" on public.teams for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor')));
create policy "editors manage positions" on public.positions for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor')));
create policy "editors manage team members" on public.team_members for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor')));
create policy "editors manage service rules" on public.service_rules for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor')));
create policy "editors manage services" on public.services for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor')));
create policy "editors manage assignments" on public.assignments for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor')));

-- Wilson Tellez should be promoted to admin; Frankie and Adiel should be editors after their Auth users are created:
-- update public.profiles set role = 'admin' where display_name = 'Wilson Tellez';
-- update public.profiles set role = 'editor' where display_name in ('Frankie', 'Adiel');
