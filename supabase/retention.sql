-- Enable Supabase Cron before accepting applications, then run this in SQL Editor.
-- Project region/timezone does not change timestamptz cutoffs. This runs daily at 18:00 UTC.
create extension if not exists pg_cron;
select cron.schedule('maskit-retention','0 18 * * *', $retention$
  delete from public.maskit_leads where created_at < now()-interval '6 months';
  delete from public.maskit_events where created_at < now()-interval '6 months';
$retention$);
-- To change an existing schedule, edit it in Integrations > Cron rather than adding duplicates.
