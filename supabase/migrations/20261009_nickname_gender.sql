begin;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

update public.profiles
set gender = case gender
  when 'woman' then 'female'
  when 'man' then 'male'
  else gender
end
where gender in ('woman', 'man');

do $migration$
begin
  if exists (
    select 1
    from public.profiles
    where gender not in ('male', 'female')
  ) then
    raise exception 'Resolve existing profile gender values before applying the Male/Female constraint.';
  end if;

  if exists (
    select 1
    from public.profiles
    group by pg_catalog.lower(pg_catalog.btrim(nickname))
    having count(*) > 1
  ) then
    raise exception 'Resolve duplicate nicknames (ignoring case and surrounding spaces) before applying the unique nickname index.';
  end if;
end;
$migration$;

alter table public.profiles
  add constraint profiles_gender_check check (gender in ('male', 'female'));

create unique index if not exists profiles_nickname_unique_ci
  on public.profiles (pg_catalog.lower(pg_catalog.btrim(nickname)));

create or replace function public.is_nickname_available(p_nickname text)
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

commit;