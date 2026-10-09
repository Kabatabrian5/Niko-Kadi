create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  second_name text not null,
  nickname text not null,
  phone text not null,
  gender text not null check (
    gender in ('male', 'female')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_nickname_unique_ci
  on public.profiles (lower(btrim(nickname)));

create function public.is_nickname_available(p_nickname text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select pg_catalog.btrim(p_nickname) <> ''
    and not exists (
      select 1
      from public.profiles as profile
      where pg_catalog.lower(pg_catalog.btrim(profile.nickname)) =
        pg_catalog.lower(pg_catalog.btrim(p_nickname))
    );
$function$;

revoke all on function public.is_nickname_available(text) from public, anon, authenticated;
grant execute on function public.is_nickname_available(text) to anon, authenticated;

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;

create policy "Players can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Players can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (
    id,
    first_name,
    second_name,
    nickname,
    phone,
    gender
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'second_name',
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'gender'
  );

  return new;
end;
$function$;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();