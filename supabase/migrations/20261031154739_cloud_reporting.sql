-- All privileged routines live in an unexposed schema and validate the caller.
-- No citizen records or sample media are seeded by this migration.
-- Explicit grants also work when automatic Data API grants are enabled.
revoke all on public.civic_reports,public.civic_events,public.civic_operators from anon,authenticated;
grant select on public.civic_reports,public.civic_events,public.civic_operators to authenticated;
grant insert(owner_id,description,category,latitude,longitude) on public.civic_reports to authenticated;
create index civic_reports_owner_created_idx on public.civic_reports(owner_id,created_at desc);
create index civic_events_actor_idx on public.civic_events(actor_id);
alter table public.civic_reports add column analysis jsonb;
alter table public.civic_reports add constraint civic_report_category check(category in ('Road damage','Water or drainage','Waste','Obstruction','Electrical','Other','Uncategorized'));

create function civic_private.prepare_report() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id<>auth.uid() then raise exception 'Authentication required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text,1));
 if (select count(*) from public.civic_reports where owner_id=new.owner_id and created_at>now()-interval '1 hour')>=5 then
  raise exception 'Hourly report limit reached' using errcode='P0001';
 end if;
 new.priority := case
  when new.description ~* '\m(collapse|electrocution|live wire|immediate danger|sinkhole|open manhole)\M' then 'Critical'
  when new.description ~* '\m(flood|sewage overflow|blocked road|water main burst)\M' then 'High'
  when new.description ~* '\m(pothole|water leak|garbage|blocked drain|broken footpath|street light not working)\M' then 'Medium'
  else 'Unassessed' end;
 return new;
end; $$;
revoke all on function civic_private.prepare_report() from public;
create trigger civic_prepare_report before insert on public.civic_reports for each row execute function civic_private.prepare_report();
create function civic_private.submitted_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id<>auth.uid() then raise exception 'Authentication required'; end if;
 insert into public.civic_events(report_id,actor_id,action,reason) values(new.id,auth.uid(),'Submitted','Original citizen submission');
 return new;
end; $$;
revoke all on function civic_private.submitted_event() from public;
create trigger civic_submitted_event after insert on public.civic_reports for each row execute function civic_private.submitted_event();

create table public.civic_evidence(
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.civic_reports(id),
 uploaded_by uuid not null references auth.users(id), object_path text not null unique,
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav')),
 byte_size integer not null check(byte_size between 1 and 5242880),
 purpose text not null check(purpose in ('report','resolution')),
 status text not null default 'pending' check(status in ('pending','ready')),
 created_at timestamptz not null default now(),
 constraint resolution_image check(purpose<>'resolution' or mime_type like 'image/%')
);
create index civic_evidence_report_idx on public.civic_evidence(report_id,status);
create index civic_evidence_uploader_idx on public.civic_evidence(uploaded_by);
alter table public.civic_evidence enable row level security;
revoke all on public.civic_evidence from anon,authenticated;
grant select on public.civic_evidence to authenticated;
create policy evidence_report_access on public.civic_evidence for select to authenticated
 using(exists(select 1 from public.civic_reports r where r.id=report_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('civic-evidence','civic-evidence',false,5242880,array['image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav']);

create function civic_private.reserve_evidence(target uuid,media_type text,bytes integer,evidence_purpose text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); report public.civic_reports; eid uuid:=gen_random_uuid(); path text; ext text;
begin
 if actor is null then raise exception 'Sign-in required'; end if;
 select * into report from public.civic_reports where id=target for update;
 if not found or (report.owner_id<>actor and not exists(select 1 from public.civic_operators where user_id=actor)) then raise exception 'Report unavailable'; end if;
 if evidence_purpose not in ('report','resolution') or bytes not between 1 and 5242880 then raise exception 'Invalid evidence'; end if;
 if evidence_purpose='resolution' and media_type not like 'image/%' then raise exception 'A resolution photograph is required'; end if;
 ext := case media_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'audio/webm' then 'webm' when 'audio/ogg' then 'ogg' when 'audio/mpeg' then 'mp3' when 'audio/mp4' then 'm4a' when 'audio/wav' then 'wav' else null end;
 if ext is null then raise exception 'Unsupported evidence format'; end if;
 if (select count(*) from public.civic_evidence where report_id=target and (status='ready' or created_at>now()-interval '15 minutes'))>=4 then raise exception 'Maximum four attachments per report'; end if;
 path := report.owner_id::text||'/'||target::text||'/'||eid::text||'.'||ext;
 insert into public.civic_evidence(id,report_id,uploaded_by,object_path,mime_type,byte_size,purpose)
 values(eid,target,actor,path,media_type,bytes,evidence_purpose);
 return jsonb_build_object('id',eid,'path',path);
end; $$;
revoke all on function civic_private.reserve_evidence(uuid,text,integer,text) from public;
grant execute on function civic_private.reserve_evidence(uuid,text,integer,text) to authenticated;
create function public.civic_reserve_evidence(target uuid,media_type text,bytes integer,evidence_purpose text)
returns jsonb language sql security invoker set search_path='' as $$ select civic_private.reserve_evidence(target,media_type,bytes,evidence_purpose); $$;
revoke all on function public.civic_reserve_evidence(uuid,text,integer,text) from public;
grant execute on function public.civic_reserve_evidence(uuid,text,integer,text) to authenticated;

-- Storage policies require a reservation. No overwrites or deletion of ready evidence.
create policy civic_evidence_upload on storage.objects for insert to authenticated with check(
 bucket_id='civic-evidence' and exists(select 1 from public.civic_evidence e where e.object_path=name and e.uploaded_by=(select auth.uid()) and e.status='pending' and e.created_at>now()-interval '15 minutes')
);
create policy civic_evidence_download on storage.objects for select to authenticated using(
 bucket_id='civic-evidence' and exists(select 1 from public.civic_evidence e where e.object_path=name)
);
create policy civic_evidence_cancel_upload on storage.objects for delete to authenticated using(
 bucket_id='civic-evidence' and exists(select 1 from public.civic_evidence e where e.object_path=name and e.uploaded_by=(select auth.uid()) and e.status='pending')
);

create function civic_private.finish_evidence(target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare item public.civic_evidence; actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Sign-in required'; end if;
 select * into item from public.civic_evidence where id=target and uploaded_by=actor for update;
 if not found then raise exception 'Evidence unavailable'; end if;
 if item.status='ready' then return; end if;
 if item.created_at<=now()-interval '15 minutes' then raise exception 'Upload reservation expired'; end if;
 if not exists(select 1 from storage.objects where bucket_id='civic-evidence' and name=item.object_path and (metadata->>'size')::bigint=item.byte_size and metadata->>'mimetype'=item.mime_type) then raise exception 'Stored evidence could not be verified'; end if;
 update public.civic_evidence set status='ready' where id=target;
 insert into public.civic_events(report_id,actor_id,action,reason) values(item.report_id,actor,'Evidence attached',item.purpose||' · '||item.mime_type);
end; $$;
revoke all on function civic_private.finish_evidence(uuid) from public;
grant execute on function civic_private.finish_evidence(uuid) to authenticated;
create function public.civic_finish_evidence(target uuid) returns void language sql security invoker set search_path='' as $$ select civic_private.finish_evidence(target); $$;
revoke all on function public.civic_finish_evidence(uuid) from public;
grant execute on function public.civic_finish_evidence(uuid) to authenticated;

create function civic_private.cancel_evidence(target uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign-in required'; end if;
 delete from public.civic_evidence e where e.id=target and e.uploaded_by=auth.uid() and e.status='pending'
 and not exists(select 1 from storage.objects o where o.bucket_id='civic-evidence' and o.name=e.object_path);
end; $$;
revoke all on function civic_private.cancel_evidence(uuid) from public;
grant execute on function civic_private.cancel_evidence(uuid) to authenticated;
create function public.civic_cancel_evidence(target uuid) returns void language sql security invoker set search_path='' as $$ select civic_private.cancel_evidence(target); $$;
revoke all on function public.civic_cancel_evidence(uuid) from public;
grant execute on function public.civic_cancel_evidence(uuid) to authenticated;

create or replace function civic_private.transition_report(target uuid,next_status text,note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); old public.civic_reports; is_operator boolean;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if note is null or length(trim(note))<3 or length(note)>2000 then raise exception 'A reason is required'; end if;
 select * into old from public.civic_reports where id=target for update;
 if not found then raise exception 'Report unavailable'; end if;
 select exists(select 1 from public.civic_operators where user_id=actor) into is_operator;
 if next_status='Closed' and old.status='Resolution proposed' and old.owner_id=actor then null;
 elsif next_status='Reopened' and old.status in ('Resolution proposed','Closed') and old.owner_id=actor then null;
 elsif is_operator and (
  (old.status in ('Submitted','Reopened') and next_status='Acknowledged') or
  (old.status='Acknowledged' and next_status='In progress') or
  (old.status='In progress' and next_status='Handoff prepared') or
  (old.status='Handoff prepared' and next_status='In progress') or
  (old.status in ('In progress','Handoff prepared') and next_status='Resolution proposed')
 ) then null;
 else raise exception 'Transition not permitted'; end if;
 if next_status='Resolution proposed' and not exists(
  select 1 from public.civic_evidence where report_id=target and status='ready' and purpose='resolution' and mime_type like 'image/%'
  and created_at>=coalesce((select max(created_at) from public.civic_events where report_id=target and action='Reopened'),old.created_at)
 ) then raise exception 'Attach a new resolution photo for this review cycle'; end if;
 update public.civic_reports set status=next_status,updated_at=now() where id=target;
 insert into public.civic_events(report_id,actor_id,action,reason) values(target,actor,next_status,trim(note));
end; $$;

create table public.civic_report_analysis(
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.civic_reports(id),
 owner_id uuid not null references auth.users(id), status text not null default 'queued' check(status in ('queued','completed','failed')),
 result jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index civic_report_analysis_owner_idx on public.civic_report_analysis(owner_id,created_at desc);
create index civic_report_analysis_report_idx on public.civic_report_analysis(report_id);
alter table public.civic_report_analysis enable row level security;
revoke all on public.civic_report_analysis from anon,authenticated;
grant select on public.civic_report_analysis to authenticated;
create policy native_analysis_owner on public.civic_report_analysis for select to authenticated using(owner_id=(select auth.uid()));

create function civic_private.reserve_report_analysis(target uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); job uuid;
begin
 if actor is null or not exists(select 1 from public.civic_reports where id=target and owner_id=actor) then raise exception 'Report unavailable'; end if;
 perform pg_catalog.pg_advisory_xact_lock(610310003);
 if (select count(*) from public.civic_report_analysis where created_at>now()-interval '24 hours')+(select count(*) from public.civic_analysis where created_at>now()-interval '24 hours')>=50
 or (select count(*) from public.civic_report_analysis where owner_id=actor and created_at>now()-interval '24 hours')+(select count(*) from public.civic_analysis where owner_id=actor and created_at>now()-interval '24 hours')>=20
 then raise exception 'Daily analysis limit reached'; end if;
 if exists(select 1 from public.civic_report_analysis where report_id=target and created_at>now()-interval '1 minute') then raise exception 'Wait one minute before retrying'; end if;
 insert into public.civic_report_analysis(report_id,owner_id) values(target,actor) returning id into job;
 return job;
end; $$;
revoke all on function civic_private.reserve_report_analysis(uuid) from public;
grant execute on function civic_private.reserve_report_analysis(uuid) to authenticated;
create function public.civic_reserve_report_analysis(target uuid) returns uuid language sql security invoker set search_path='' as $$ select civic_private.reserve_report_analysis(target); $$;
revoke all on function public.civic_reserve_report_analysis(uuid) from public;
grant execute on function public.civic_reserve_report_analysis(uuid) to authenticated;

-- Only a trusted server worker can persist model provenance and the AI audit event.
create function civic_private.complete_report_analysis(target uuid,assessment jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare job public.civic_report_analysis;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Worker required'; end if;
 select * into job from public.civic_report_analysis where id=target for update;
 if not found or job.status<>'queued' then return; end if;
 update public.civic_report_analysis set status=case when assessment is null then 'failed' else 'completed' end,result=assessment,updated_at=now() where id=target;
 if assessment is not null then
  update public.civic_reports set analysis=assessment,updated_at=now() where id=job.report_id;
  insert into public.civic_events(report_id,actor_id,action,reason) values(job.report_id,job.owner_id,'Live AI analysis','Gemini analysis saved; human verification required.');
 end if;
end; $$;
revoke all on function civic_private.complete_report_analysis(uuid,jsonb) from public;
grant usage on schema civic_private to service_role;
grant execute on function civic_private.complete_report_analysis(uuid,jsonb) to service_role;
create function public.civic_complete_report_analysis(target uuid,assessment jsonb) returns void language sql security invoker set search_path='' as $$ select civic_private.complete_report_analysis(target,assessment); $$;
revoke all on function public.civic_complete_report_analysis(uuid,jsonb) from public;
grant execute on function public.civic_complete_report_analysis(uuid,jsonb) to service_role;

grant all on public.civic_evidence,public.civic_report_analysis to service_role;

-- Source and native analyses share one daily budget and one reservation lock.
create or replace function civic_private.reserve_analysis(source text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid;
begin
 if actor is null then raise exception 'Sign-in required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(610310003);
 if not exists(select 1 from public.civic_sources s where s.id=source) then raise exception 'Unknown source'; end if;
 select id into target from public.civic_analysis where owner_id=actor and source_id=source and status='queued' and created_at>now()-interval '5 minutes' limit 1;
 if target is not null then return jsonb_build_object('id',target,'existing',true); end if;
 if (select count(*) from public.civic_report_analysis where created_at>now()-interval '24 hours')+(select count(*) from public.civic_analysis where created_at>now()-interval '24 hours')>=50
 or (select count(*) from public.civic_report_analysis where owner_id=actor and created_at>now()-interval '24 hours')+(select count(*) from public.civic_analysis where owner_id=actor and created_at>now()-interval '24 hours')>=20
 then raise exception 'Daily analysis limit reached'; end if;
 insert into public.civic_analysis(owner_id,source_id) values(actor,source) returning id into target;
 return jsonb_build_object('id',target,'existing',false);
end; $$;

create function public.civic_schema_version() returns integer language sql security invoker set search_path='' as $$ select 4; $$;
revoke all on function public.civic_schema_version() from public;
grant execute on function public.civic_schema_version() to anon,authenticated;
