-- Private reporting views for the Supabase dashboard. No public read access.
create or replace view public.maskit_funnel_report with(security_invoker=true) as
with events as (select * from public.maskit_events where not is_test),
visits as (
 select source,campaign,count(*) filter(where event_name='page_view') as page_views,
 count(distinct session_id) filter(where event_name='page_view') as visit_sessions
 from events group by source,campaign
), kinds as (select unnest(array['preregistration','enterprise']) as lead_kind),
funnel as (
 select source,campaign,lead_kind,
 count(*) filter(where event_name='cta_click') as cta_clicks,
 count(distinct session_id) filter(where event_name='cta_click') as click_sessions,
 count(distinct session_id) filter(where event_name='form_start') as form_start_sessions,
 count(*) filter(where event_name='lead_submitted') as new_leads,
 count(distinct session_id) filter(where event_name='lead_submitted') as submitted_sessions
 from events where lead_kind is not null group by source,campaign,lead_kind
)
select v.source,v.campaign,k.lead_kind,v.page_views,v.visit_sessions,
 coalesce(f.cta_clicks,0) as cta_clicks,coalesce(f.click_sessions,0) as click_sessions,
 coalesce(f.form_start_sessions,0) as form_start_sessions,coalesce(f.new_leads,0) as new_leads,
 round(100.0*coalesce(f.submitted_sessions,0)/nullif(v.visit_sessions,0),2) as visit_to_submit_percent,
 round(100.0*coalesce(f.submitted_sessions,0)/nullif(f.click_sessions,0),2) as click_to_submit_percent
from visits v cross join kinds k left join funnel f on f.source=v.source and f.campaign=v.campaign and f.lead_kind=k.lead_kind;

create or replace view public.maskit_cta_report with(security_invoker=true) as
select (created_at at time zone 'Asia/Seoul')::date as day_kst,lead_kind,placement,source,campaign,
 count(*) as clicks,count(distinct session_id) as click_sessions
from public.maskit_events where not is_test and event_name='cta_click'
group by 1,lead_kind,placement,source,campaign;

create or replace view public.maskit_profession_report with(security_invoker=true) as
select lead_kind,profession,count(*) as new_leads from public.maskit_leads
where not is_test group by lead_kind,profession;

revoke all on public.maskit_funnel_report,public.maskit_cta_report,public.maskit_profession_report from public,anon,authenticated;
