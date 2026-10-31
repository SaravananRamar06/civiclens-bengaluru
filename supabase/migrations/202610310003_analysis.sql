create table public.civic_analysis(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),source_id text not null references public.civic_sources(id),status text not null default 'queued' check(status in ('queued','completed','failed')),result jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index civic_analysis_owner_idx on public.civic_analysis(owner_id,created_at);
create index civic_analysis_source_idx on public.civic_analysis(source_id);
alter table public.civic_analysis enable row level security;
grant select on public.civic_analysis to authenticated;
create policy analysis_owner_read on public.civic_analysis for select to authenticated using(owner_id=(select auth.uid()));
create function civic_private.reserve_analysis(source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid;
begin
 if actor is null then raise exception 'Sign-in required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(610310003);
 if not exists(select 1 from public.civic_sources s where s.id=source) then raise exception 'Unknown source'; end if;
 if (select count(*) from public.civic_analysis where created_at>now()-interval '24 hours')>=50 or (select count(*) from public.civic_analysis where owner_id=actor and created_at>now()-interval '24 hours')>=20 then raise exception 'Daily analysis limit reached'; end if;
 select id into target from public.civic_analysis where owner_id=actor and source_id=source and status='queued' and created_at>now()-interval '5 minutes' limit 1;
 if target is not null then return jsonb_build_object('id',target,'existing',true); end if;
 insert into public.civic_analysis(owner_id,source_id) values(actor,source) returning id into target;
 return jsonb_build_object('id',target,'existing',false);
end; $$;
revoke all on function civic_private.reserve_analysis(text) from public;
grant execute on function civic_private.reserve_analysis(text) to authenticated;
create function public.civic_reserve_analysis(source text) returns jsonb language sql security invoker set search_path='' as $$select civic_private.reserve_analysis(source);$$;
revoke all on function public.civic_reserve_analysis(text) from public;
grant execute on function public.civic_reserve_analysis(text) to authenticated;
create function civic_private.fail_analysis(target uuid) returns void language plpgsql security definer set search_path='' as $$begin if auth.uid() is null then raise exception 'Sign-in required'; end if; update public.civic_analysis set status='failed',updated_at=now() where id=target and owner_id=auth.uid() and status='queued';end;$$;
revoke all on function civic_private.fail_analysis(uuid) from public;
grant execute on function civic_private.fail_analysis(uuid) to authenticated;
create function public.civic_fail_analysis(target uuid) returns void language sql security invoker set search_path='' as $$select civic_private.fail_analysis(target);$$;
revoke all on function public.civic_fail_analysis(uuid) from public;
grant execute on function public.civic_fail_analysis(uuid) to authenticated;
