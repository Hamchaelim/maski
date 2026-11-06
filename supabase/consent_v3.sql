-- 2026-11-06 v3: 체험 신청(preregistration)의 직군을 '선택' 항목으로 바꾼다.
-- 반드시 사이트(index.html/leads.js?v=maski-6) 배포 전에 Supabase SQL Editor에서 한 번 실행할 것.
-- profession_v2.sql을 이미 실행한 상태를 전제로 한다. 테이블·뷰·기존 행은 바꾸지 않고 저장 함수만 교체한다.
-- 규칙
--   v3 체험 신청: 직군 미선택이면 'unknown'. 직군을 남기면 선택 동의(p_optional_consent) 필수. 기타는 직접 입력 필수.
--   v2 체험 신청(배포 직후 캐시된 페이지): 기존대로 직군 필수.
--   v1 또는 기업 문의: 직군을 받지 않음('unknown').
begin;

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
    or p_consent_version not in ('2026-11-06-v1','2026-11-06-v2','2026-11-06-v3')
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
  if p_lead_kind='preregistration' and p_consent_version='2026-11-06-v3' then
    -- 현재 체험 신청 폼: 직군 선택 항목
    if normalized_profession not in ('unknown','tax','labor','law','accounting','office_staff','employee','student','other')
      or (normalized_profession='other' and length(normalized_other)=0) then
      raise exception 'Invalid application';
    end if;
    if normalized_profession<>'unknown' and p_optional_consent is distinct from true then
      raise exception 'Optional consent required';
    end if;
  elsif p_lead_kind='preregistration' and p_consent_version='2026-11-06-v2' then
    -- 배포 직후 캐시된 v2 페이지: 직군 필수
    if normalized_profession not in ('tax','labor','law','accounting','office_staff','employee','student','other')
      or (normalized_profession='other' and length(normalized_other)=0) then
      raise exception 'Profession is required';
    end if;
  else
    -- 기업 문의, 또는 v1 페이지: 직군을 받지 않음
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

commit;
notify pgrst, 'reload schema';
