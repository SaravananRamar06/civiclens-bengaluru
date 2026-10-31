create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists civic_private;

create table public.civic_sources (
 id text primary key, category text not null, detail text not null, ward text not null,
 reported_at text not null, source_status text not null,
 source_url text not null, fetched_at timestamptz not null,
 location extensions.geography(Point,4326)
);
create index civic_sources_location_idx on public.civic_sources using gist(location);
create index civic_sources_category_idx on public.civic_sources(category);
alter table public.civic_sources enable row level security;
grant select on public.civic_sources to anon,authenticated;
create policy source_public_read on public.civic_sources for select to anon,authenticated using(true);

create table public.civic_operators(user_id uuid primary key references auth.users(id), created_at timestamptz not null default now());
alter table public.civic_operators enable row level security;
grant select on public.civic_operators to authenticated;
create policy operator_self_read on public.civic_operators for select to authenticated using(user_id=(select auth.uid()));

create table public.civic_reports (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 description text not null check(length(description) between 10 and 4000),
 category text not null default 'Uncategorized',
 latitude double precision not null check(latitude between 12.65 and 13.3),
 longitude double precision not null check(longitude between 77.2 and 77.95),
 location extensions.geography(Point,4326) generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography) stored,
 status text not null default 'Submitted' check(status in ('Submitted','Acknowledged','In progress','Handoff prepared','Resolution proposed','Closed','Reopened')),
 priority text not null default 'Unassessed',
 public_summary text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index civic_reports_owner_idx on public.civic_reports(owner_id);
create index civic_reports_location_idx on public.civic_reports using gist(location);
alter table public.civic_reports enable row level security;
grant select on public.civic_reports to authenticated;
grant insert(owner_id,description,category,latitude,longitude) on public.civic_reports to authenticated;
create policy report_read on public.civic_reports for select to authenticated using(owner_id=(select auth.uid()) or exists(select 1 from public.civic_operators o where o.user_id=(select auth.uid())));
create policy report_insert on public.civic_reports for insert to authenticated with check(owner_id=(select auth.uid()));

create table public.civic_events(id bigint generated always as identity primary key,report_id uuid not null references public.civic_reports(id),actor_id uuid not null references auth.users(id), action text not null, reason text not null,created_at timestamptz not null default now());
create index civic_events_report_idx on public.civic_events(report_id);
alter table public.civic_events enable row level security;
grant select on public.civic_events to authenticated;
create policy event_read on public.civic_events for select to authenticated using(exists(select 1 from public.civic_reports r where r.id=report_id));

create function civic_private.transition_report(target uuid,next_status text,note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); old public.civic_reports; is_operator boolean;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if length(trim(note))<3 or length(note)>2000 then raise exception 'A reason is required'; end if;
 select * into old from public.civic_reports where id=target for update;
 if not found then raise exception 'Report unavailable'; end if;
 select exists(select 1 from public.civic_operators where user_id=actor) into is_operator;
 if next_status='Closed' and old.status='Resolution proposed' and old.owner_id=actor then null;
 elsif next_status='Reopened' and old.status in ('Resolution proposed','Closed') and old.owner_id=actor then null;
 elsif is_operator and ((old.status='Submitted' and next_status='Acknowledged') or (old.status in ('Acknowledged','Reopened') and next_status='In progress') or (old.status='In progress' and next_status='Handoff prepared')) then null;
 else raise exception 'Transition not permitted'; end if;
 update public.civic_reports set status=next_status,updated_at=now() where id=target;
 insert into public.civic_events(report_id,actor_id,action,reason) values(target,actor,next_status,note);
end; $$;
revoke all on function civic_private.transition_report(uuid,text,text) from public;
grant usage on schema civic_private to authenticated;
grant execute on function civic_private.transition_report(uuid,text,text) to authenticated;
create function public.civic_transition(target uuid,next_status text,note text) returns void language sql security invoker set search_path='' as $$select civic_private.transition_report(target,next_status,note);$$;
revoke all on function public.civic_transition(uuid,text,text) from public;
grant execute on function public.civic_transition(uuid,text,text) to authenticated;

create function public.civic_source_stats() returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_object('total',count(*),'closed',count(*) filter(where lower(source_status)='closed'),'wards',count(distinct ward),'fetchedAt',max(fetched_at),'dateRange',jsonb_build_object('from',min(reported_at),'to',max(reported_at))) from public.civic_sources;
$$;
grant execute on function public.civic_source_stats() to anon,authenticated;
