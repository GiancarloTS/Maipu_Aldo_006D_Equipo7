begin;

create table if not exists public.push_devices (
  user_id uuid not null references public.usuarios(id) on delete cascade,
  expo_push_token text not null,
  updated_at timestamp with time zone not null default now(),
  primary key (user_id, expo_push_token)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.usuarios(id) on delete cascade,
  medicines boolean not null default true,
  alerts boolean not null default true,
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.notification_dispatches (
  event_id uuid not null,
  event_type text not null,
  notified_at timestamp with time zone not null default now(),
  primary key (event_id, event_type)
);

alter table public.push_devices enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_dispatches enable row level security;
revoke all on public.push_devices, public.notification_preferences from public, anon, authenticated;
revoke all on public.notification_dispatches from public, anon, authenticated;
grant select, insert, update, delete on public.push_devices to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

drop policy if exists linkcare_push_devices_self on public.push_devices;
create policy linkcare_push_devices_self
  on public.push_devices for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists linkcare_notification_preferences_self on public.notification_preferences;
create policy linkcare_notification_preferences_self
  on public.notification_preferences for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;