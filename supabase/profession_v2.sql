-- 2026-11-06 v2: '체험하기'(preregistration) 신청에서 직군을 필수로 받는다.
-- 반드시 사이트(index.html/leads.js) 배포 전에 Supabase SQL Editor에서 한 번 실행할 것.
-- 내부 이름(maskit_*, preregistration)은 그대로 유지한다. 기존 행은 삭제·변경하지 않는다.
begin;

-- 1) 직군 값 확장 + 기타 직접 입력 열
do $$ declare c record; begin
  for c in select conname from pg_constraint
    where conrelid='public.maskit_leads'::regclass and contype='c'
      and pg_get_constraintdef(oid) like '%profession%' and pg_get_constraintdef(oid) not like '%profession_other%'
  loop execute format('alter table public.maskit_leads drop constraint %I',c.conname); end loop;
end $$;
alter table public.maskit_leads add constraint maskit_leads_profession_check check(profession in (
  'unknown','labor','tax','law','business','other',          -- 기존 값(과거 기록 보존)
  'accounting','office_staff','employee','student'           -- v2 추가
));
alter table public.maskit_leads add column if not exists profession_other text not null default '';
alter table public.maskit_leads drop constraint if exists maskit_leads_profession_other_check;
alter table public.maskit_leads add constraint maskit_leads_profession_other_check
  check(length(profession_other)<=50 and (profession='other' or profession_other=''));

-- 2) 저장 함수 교체 (파라미터가 늘어나므로 기존 시그니처를 지우고 새로 만든다)
drop function if exists public.maskit_submit_lead(uuid,uuid,text,text,text,text,text,text,text,boolean,boolean,text,text,text,boolean);

create or replace function public.maskit_submit_lead(
  p_request_id uuid,p_session_id uuid,p_lead_kind text,p_name text,p_email text,
  p_phone text default '',p_company text default '',p_company_size text default '',p_profession text default 'unknown',
  p_consent boolean default false,p_optional_consent boolean default false,p_consent_version text default '',
  p_source text default 'direct',p_campaign text default '',p_is_test boolean default false,
  p_profession_other text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  normalized_email text:=lower(btrim(coalesce(p_email,'')));
  normalized_name text:=btrim(coalesce(p_name,''));
  normalized_phone text:=btrim(coalesce(p_phone,''));
  normalized_profession text:=coalesce(nullif(btrim(coalesce(p_profession,'')),''),'unknown');
  normalized_other text:=btrim(coalesce(p_profession_other,''));
  inserted_count integer;
begin
  if p_request_id is null or p_session_id is null or p_lead_kind is null
    or p_lead_kind not in ('preregistration','enterprise')
    or p_consent is distinct from true
    or p_consent_version not in ('2026-11-06-v1','2026-11-06-v2')
    or length(normalized_name) not between 1 and 50
    or length(normalized_email)>254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or (normalized_phone<>'' and (p_optional_consent is distinct from true or normalized_phone !~ '^\+?[0-9]{8,15}$'))
    or length(coalesce(p_company,''))>100
    or coalesce(p_company_size,'') not in ('','1-10','11-50','51-200','201-1000','1001+')
    or length(coalesce(p_source,''))>100 or length(coalesce(p_campaign,''))>100
    or length(normalized_other)>50 or normalized_other ~ '[[:cntrl:]]' then
    raise exception 'Invalid application';
  end if;

  -- 직군 규칙
  if p_lead_kind='preregistration' and p_consent_version='2026-11-06-v2' then
    -- 새 체험 신청 폼: 직군 필수(필수 동의 항목), 기타는 직접 입력 필수
    if normalized_profession not in ('tax','labor','law','accounting','office_staff','employee','student','other')
      or (normalized_profession='other' and length(normalized_other)=0) then
      raise exception 'Profession is required';
    end if;
  else
    -- 기업 문의, 또는 배포 전 캐시된 v1 페이지: 직군을 받지 않음
    if normalized_profession<>'unknown' then raise exception 'Invalid application'; end if;
  end if;
  if normalized_profession<>'other' then normalized_other:=''; end if;

  if p_lead_kind='enterprise' and (length(btrim(coalesce(p_company,'')))=0 or coalesce(p_company_size,'')='') then
    raise exception 'Organization is required';
  end if;
  if (select count(*) from public.maskit_leads where session_id=p_session_id and created_at>now()-interval '1 hour')>=5 then
    raise exception 'Too many applications';
  end if;

  insert into public.maskit_leads(request_id,session_id,lead_kind,name,email,phone,company,company_size,profession,profession_other,consent_version,optional_consent,source,campaign,is_test)
  values(p_request_id,p_session_id,p_lead_kind,normalized_name,normalized_email,normalized_phone,
    case when p_lead_kind='enterprise' then btrim(coalesce(p_company,'')) else '' end,
    case when p_lead_kind='enterprise' then coalesce(p_company_size,'') else '' end,
    normalized_profession,normalized_other,p_consent_version,coalesce(p_optional_consent,false),
    coalesce(p_source,'direct'),coalesce(p_campaign,''),coalesce(p_is_test,false))
  on conflict do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=1 then
    insert into public.maskit_events(id,session_id,event_name,lead_kind,placement,source,campaign,is_test)
    values(gen_random_uuid(),p_session_id,'lead_submitted',p_lead_kind,'form',coalesce(p_source,'direct'),coalesce(p_campaign,''),coalesce(p_is_test,false));
  end if;
  -- 신규/중복 모두 같은 응답. 이메일 존재 여부를 노출하지 않음.
  return jsonb_build_object('ok',true);
end; $$;

revoke all on function public.maskit_submit_lead(uuid,uuid,text,text,text,text,text,text,text,boolean,boolean,text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.maskit_submit_lead(uuid,uuid,text,text,text,text,text,text,text,boolean,boolean,text,text,text,boolean,text) to anon;

-- 3) 관리용 목록: 신청종류 표시를 '체험 신청'으로, 직군·직군_기타 열 추가 (열 구성이 바뀌어 재생성)
drop view if exists public.maski_live_leads;
drop view if exists public.maski_test_leads;
create view public.maski_live_leads with(security_invoker=true) as
select (created_at at time zone 'Asia/Seoul') as "신청일시_한국",
case lead_kind when 'preregistration' then '체험 신청' else '기업 도입 문의' end as "신청종류",
name as "이름",email as "이메일",phone as "전화번호",
case profession when 'tax' then '세무사' when 'labor' then '노무사' when 'law' then '변호사' when 'accounting' then '회계사'
  when 'office_staff' then '전문직 사무소 직원' when 'employee' then '회사원' when 'student' then '학생'
  when 'business' then '기업 실무자·보안 담당자' when 'other' then '기타' else '미응답' end as "직군",
profession_other as "직군_기타",
company as "회사_사무소",company_size as "회사규모",source as "유입경로",campaign as "캠페인",id as "관리번호"
from public.maskit_leads where not is_test;
create view public.maski_test_leads with(security_invoker=true) as
select (created_at at time zone 'Asia/Seoul') as "신청일시_한국",
case lead_kind when 'preregistration' then '체험 신청' else '기업 도입 문의' end as "신청종류",
name as "이름",email as "이메일",phone as "전화번호",
case profession when 'tax' then '세무사' when 'labor' then '노무사' when 'law' then '변호사' when 'accounting' then '회계사'
  when 'office_staff' then '전문직 사무소 직원' when 'employee' then '회사원' when 'student' then '학생'
  when 'business' then '기업 실무자·보안 담당자' when 'other' then '기타' else '미응답' end as "직군",
profession_other as "직군_기타",
company as "회사_사무소",company_size as "회사규모",source as "유입경로",campaign as "캠페인",id as "관리번호"
from public.maskit_leads where is_test;
revoke all on public.maski_live_leads,public.maski_test_leads from public,anon,authenticated;

commit;
-- 반영 후 PostgREST가 새 함수를 바로 인식하도록 스키마 캐시 갱신
notify pgrst, 'reload schema';
