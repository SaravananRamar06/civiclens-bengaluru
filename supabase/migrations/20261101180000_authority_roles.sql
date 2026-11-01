-- Role-based access for staff. An admin reviews every report; an officer reviews
-- only reports routed to their authority. Roles are granted by a database
-- administrator and never from user-editable metadata.
alter table public.civic_operators add column role text not null default 'admin' check(role in ('admin','officer'));
alter table public.civic_operators add column authority text;
alter table public.civic_operators add constraint civic_officer_authority check(role='admin' or authority is not null);

create function civic_private.can_review(report_authority text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.civic_operators o
  where o.user_id=auth.uid() and (o.role='admin' or o.authority=report_authority));
$$;
revoke all on function civic_private.can_review(text) from public;
grant execute on function civic_private.can_review(text) to authenticated;

-- Evidence, events and stored files all read through this policy, so they inherit the scope.
drop policy report_read on public.civic_reports;
create policy report_read on public.civic_reports for select to authenticated
 using(owner_id=(select auth.uid()) or civic_private.can_review(authority));

create or replace function civic_private.reserve_evidence(target uuid,media_type text,bytes integer,evidence_purpose text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); report public.civic_reports; eid uuid:=gen_random_uuid(); path text; ext text;
begin
 if actor is null then raise exception 'Sign-in required'; end if;
 select * into report from public.civic_reports where id=target for update;
 if not found or (report.owner_id<>actor and not civic_private.can_review(report.authority)) then raise exception 'Report unavailable'; end if;
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

create or replace function civic_private.transition_report(target uuid,next_status text,note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); old public.civic_reports; is_reviewer boolean;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if note is null or length(trim(note))<3 or length(note)>2000 then raise exception 'A reason is required'; end if;
 select * into old from public.civic_reports where id=target for update;
 if not found then raise exception 'Report unavailable'; end if;
 is_reviewer := civic_private.can_review(old.authority);
 if next_status='Closed' and old.status='Resolution proposed' and old.owner_id=actor then null;
 elsif next_status='Reopened' and old.status in ('Resolution proposed','Closed') and old.owner_id=actor then null;
 elsif is_reviewer and (
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

create or replace function public.civic_schema_version() returns integer language sql security invoker set search_path='' as $$ select 6; $$;
