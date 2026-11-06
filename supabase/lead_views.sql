create or replace view public.maski_live_leads with(security_invoker=true) as
select (created_at at time zone 'Asia/Seoul') as "신청일시_한국",
case lead_kind when 'preregistration' then '사전예약' else '기업 도입 문의' end as "신청종류",
name as "이름",email as "이메일",phone as "전화번호",
case profession when 'labor' then '노무사' when 'tax' then '세무사' when 'law' then '변호사' when 'business' then '기업 실무자·보안 담당자' when 'other' then '기타' else '미응답' end as "직군",
company as "회사_사무소",company_size as "회사규모",source as "유입경로",campaign as "캠페인",id as "관리번호"
from public.maskit_leads where not is_test;
create or replace view public.maski_test_leads with(security_invoker=true) as
select (created_at at time zone 'Asia/Seoul') as "신청일시_한국",
case lead_kind when 'preregistration' then '사전예약' else '기업 도입 문의' end as "신청종류",
name as "이름",email as "이메일",phone as "전화번호",company as "회사_사무소",company_size as "회사규모",source as "유입경로",campaign as "캠페인",id as "관리번호"
from public.maskit_leads where is_test;
revoke all on public.maski_live_leads,public.maski_test_leads from public,anon,authenticated;
