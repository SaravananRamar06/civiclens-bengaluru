-- Opens the record: every report is routed to an authority and appears in an
-- anonymised public view. Descriptions, evidence, identities and exact locations stay private.
alter table public.civic_reports drop constraint civic_report_category;
alter table public.civic_reports add constraint civic_report_category check(category in ('Road damage','Water or drainage','Pollution','Waste','Obstruction','Electrical','Other','Uncategorized'));
alter table public.civic_reports add column authority text not null default 'City corporation: general';

-- Keep in step with authorityFor in src/lib/routing.ts.
create function civic_private.authority_for(report_category text,report_text text) returns text
language sql immutable set search_path='' as $$
 select case report_category
  when 'Road damage' then 'City corporation: roads'
  when 'Obstruction' then 'City corporation: roads'
  when 'Water or drainage' then case when report_text ~* '\m(storm ?water|storm drains?|rajakaluve)\M' then 'City corporation: stormwater drains' else 'BWSSB: water and sewerage' end
  when 'Pollution' then 'KSPCB: pollution'
  when 'Waste' then 'BSWML: solid waste'
  when 'Electrical' then case when report_text ~* '\mstreet ?lights?\M' then 'City corporation: street lights' else 'BESCOM: electricity' end
  else 'City corporation: general' end;
$$;
revoke all on function civic_private.authority_for(text,text) from public;

-- Keep in step with priorityFor in src/lib/triage.ts.
create or replace function civic_private.prepare_report() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id<>auth.uid() then raise exception 'Authentication required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text,1));
 if (select count(*) from public.civic_reports where owner_id=new.owner_id and created_at>now()-interval '1 hour')>=5 then
  raise exception 'Hourly report limit reached' using errcode='P0001';
 end if;
 new.priority := case
  when new.description ~* '\m(collaps(e|ed|es|ing)|electrocut(ed|ion)|(live|exposed) wires?|immediate danger|sinkholes?|(open|uncovered) man ?holes?|man ?hole( cover)?( is| are)? (open|missing|broken))\M' then 'Critical'
  when new.description ~* '\m(flood(s|ed|ing)?|waterlogg(ed|ing)|sewage( is)? overflow(s|ing)?|blocked roads?|road( is)? blocked|water main burst|burst water main)\M' then 'High'
  when new.description ~* '\m(potholes?|water leaks?|garbage|blocked drains?|broken footpaths?|street ?lights?( is| are)? not working)\M' then 'Medium'
  else 'Unassessed' end;
 new.authority := civic_private.authority_for(new.category,new.description);
 return new;
end; $$;

-- The trusted worker saves the assessment, the severity and any corrected routing together.
create or replace function civic_private.complete_report_analysis(target uuid,assessment jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare job public.civic_report_analysis;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Worker required'; end if;
 select * into job from public.civic_report_analysis where id=target for update;
 if not found or job.status<>'queued' then return; end if;
 update public.civic_report_analysis set status=case when assessment is null then 'failed' else 'completed' end,result=assessment,updated_at=now() where id=target;
 if assessment is not null then
  update public.civic_reports set analysis=assessment,
   priority=coalesce(nullif(assessment->>'severity',''),priority),
   category=coalesce(nullif(assessment->>'category',''),category),
   authority=coalesce(nullif(assessment->>'authority',''),authority),
   updated_at=now() where id=job.report_id;
  insert into public.civic_events(report_id,actor_id,action,reason) values(job.report_id,job.owner_id,'Live AI analysis','Severity rated and routing confirmed by Gemini; human verification required.');
 end if;
end; $$;

create function public.civic_public_reports()
returns table(ref text,category text,authority text,severity text,status text,filed timestamptz,acknowledged timestamptz,confirmed timestamptz,latitude double precision,longitude double precision)
language sql stable security definer set search_path='' as $$
 select left(r.id::text,8),r.category,r.authority,r.priority,r.status,r.created_at,
  (select min(e.created_at) from public.civic_events e where e.report_id=r.id and e.action='Acknowledged'),
  (select min(e.created_at) from public.civic_events e where e.report_id=r.id and e.action='Closed'),
  round(r.latitude::numeric,2)::double precision,round(r.longitude::numeric,2)::double precision
 from public.civic_reports r order by r.created_at desc limit 500;
$$;
revoke all on function public.civic_public_reports() from public;
grant execute on function public.civic_public_reports() to anon,authenticated;

create or replace function public.civic_schema_version() returns integer language sql security invoker set search_path='' as $$ select 5; $$;
