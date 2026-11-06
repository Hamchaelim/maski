-- Run once in the new Supabase project's SQL Editor. No client may read these tables.
begin;
create table if not exists public.maskit_events (
  id uuid primary key,
  created_at timestamptz not null default now(),
  session_id uuid not null,
  event_name text not null check(event_name in ('page_view','cta_click','form_start','form_submit_attempt','lead_submitted','workflow_step')),
  lead_kind text check(lead_kind in ('preregistration','enterprise')),
  placement text not null check(length(placement)<=40),
  source text not null default 'direct' check(length(source)<=100),
  campaign text not null default '' check(length(campaign)<=100),
  is_test boolean not null default false
);
create table if not exists public.maskit_leads (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  created_at timestamptz not null default now(),
  session_id uuid not null,
  lead_kind text not null check(lead_kind in ('preregistration','enterprise')),
  name text not null check(length(name) between 1 and 50),
  email text not null check(length(email) between 3 and 254),
  phone text not null default '' check(length(phone)<=20),
  company text not null default '' check(length(company)<=100),
  company_size text not null default '' check(company_size in ('','1-10','11-50','51-200','201-1000','1001+')),
  profession text not null default 'unknown' check(profession in ('unknown','labor','tax','law','business','other')),
  consent_version text not null,
  consented_at timestamptz not null default now(),
  optional_consent boolean not null default false,
  source text not null check(length(source)<=100),
  campaign text not null default '' check(length(campaign)<=100),
  is_test boolean not null default false,
  unique(lead_kind,email,is_test)
);
create index if not exists maskit_events_session_time on public.maskit_events(session_id,created_at);
create index if not exists maskit_leads_session_time on public.maskit_leads(session_id,created_at);
alter table public.maskit_events enable row level security;
alter table public.maskit_leads enable row level security;
revoke all on public.maskit_events,public.maskit_leads from public,anon,authenticated;

create or replace function public.maskit_track_event(
  p_event_id uuid,p_session_id uuid,p_event_name text,p_lead_kind text default null,
  p_placement text default 'page',p_source text default 'direct',p_campaign text default '',p_is_test boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if p_session_id is null or p_event_id is null or p_event_name is null
    or p_event_name not in ('page_view','cta_click','form_start','form_submit_attempt','workflow_step')
    or coalesce(p_lead_kind,'') not in ('','preregistration','enterprise')
    or coalesce(p_placement,'') not in ('page','hero','nav','bottom','form','step_1','step_2','step_3','step_4')
    or length(coalesce(p_source,''))>100 or length(coalesce(p_campaign,''))>100 then
    raise exception 'Invalid event';
  end if;
  if (select count(*) from public.maskit_events where session_id=p_session_id and created_at>now()-interval '1 hour')>=240 then
    raise exception 'Too many events';
  end if;
  insert into public.maskit_events(id,session_id,event_name,lead_kind,placement,source,campaign,is_test)
  values(p_event_id,p_session_id,p_event_name,nullif(p_lead_kind,''),p_placement,coalesce(p_source,'direct'),coalesce(p_campaign,''),coalesce(p_is_test,false))
  on conflict(id) do nothing;
  return jsonb_build_object('ok',true);
end; $$;

create or replace function public.maskit_submit_lead(
  p_request_id uuid,p_session_id uuid,p_lead_kind text,p_name text,p_email text,
  p_phone text default '',p_company text default '',p_company_size text default '',p_profession text default 'unknown',
  p_consent boolean default false,p_optional_consent boolean default false,p_consent_version text default '',
  p_source text default 'direct',p_campaign text default '',p_is_test boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  normalized_email text:=lower(btrim(coalesce(p_email,'')));
  normalized_name text:=btrim(coalesce(p_name,''));
  normalized_phone text:=btrim(coalesce(p_phone,''));
  inserted_count integer;
begin
  if p_request_id is null or p_session_id is null or p_lead_kind is null
    or p_lead_kind not in ('preregistration','enterprise')
    or p_consent is distinct from true or p_consent_version is distinct from '2026-11-06-v1'
    or length(normalized_name) not between 1 and 50
    or length(normalized_email)>254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or (normalized_phone<>'' and (p_optional_consent is distinct from true or normalized_phone !~ '^\+?[0-9]{8,15}$'))
    or (coalesce(p_profession,'unknown')<>'unknown' and p_optional_consent is distinct from true)
    or coalesce(p_profession,'unknown') not in ('unknown','labor','tax','law','business','other')
    or length(coalesce(p_company,''))>100
    or coalesce(p_company_size,'') not in ('','1-10','11-50','51-200','201-1000','1001+')
    or length(coalesce(p_source,''))>100 or length(coalesce(p_campaign,''))>100 then
    raise exception 'Invalid application';
  end if;
  if p_lead_kind='enterprise' and (length(btrim(coalesce(p_company,'')))=0 or coalesce(p_company_size,'')='') then
    raise exception 'Organization is required';
  end if;
  if (select count(*) from public.maskit_leads where session_id=p_session_id and created_at>now()-interval '1 hour')>=5 then
    raise exception 'Too many applications';
  end if;
  insert into public.maskit_leads(request_id,session_id,lead_kind,name,email,phone,company,company_size,profession,consent_version,optional_consent,source,campaign,is_test)
  values(p_request_id,p_session_id,p_lead_kind,normalized_name,normalized_email,normalized_phone,
    case when p_lead_kind='enterprise' then btrim(coalesce(p_company,'')) else '' end,
    case when p_lead_kind='enterprise' then coalesce(p_company_size,'') else '' end,
    coalesce(p_profession,'unknown'),p_consent_version,coalesce(p_optional_consent,false),
    coalesce(p_source,'direct'),coalesce(p_campaign,''),coalesce(p_is_test,false))
  on conflict do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=1 then
    insert into public.maskit_events(id,session_id,event_name,lead_kind,placement,source,campaign,is_test)
    values(gen_random_uuid(),p_session_id,'lead_submitted',p_lead_kind,'form',coalesce(p_source,'direct'),coalesce(p_campaign,''),coalesce(p_is_test,false));
  end if;
  -- Same reply for new and duplicate submissions; do not reveal whether an email already exists.
  return jsonb_build_object('ok',true);
end; $$;

revoke all on function public.maskit_track_event(uuid,uuid,text,text,text,text,text,boolean) from public,anon,authenticated;
revoke all on function public.maskit_submit_lead(uuid,uuid,text,text,text,text,text,text,text,boolean,boolean,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.maskit_track_event(uuid,uuid,text,text,text,text,text,boolean) to anon;
grant execute on function public.maskit_submit_lead(uuid,uuid,text,text,text,text,text,text,text,boolean,boolean,text,text,text,boolean) to anon;
comment on table public.maskit_events is 'No raw form fields. Public clients can only call validated write functions.';
comment on table public.maskit_leads is 'Contains contact information. Dashboard/owner access only; no public read policies.';
commit;
