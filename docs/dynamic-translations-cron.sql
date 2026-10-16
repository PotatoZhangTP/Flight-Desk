-- OPTIONAL, MANUAL OPT-IN ONLY. Not a schema migration or deployment hook.
-- Run only after worker deployment, budget review, and Supabase Vault setup.
-- Required Vault names (enter values in Supabase, never commit them):
--   flightdesk_translation_worker_url  (HTTPS URL ending /api/internal/translations/process)
--   flightdesk_translation_cron_secret (same value as server-only Vercel CRON_SECRET)
-- Optional Vault name for protected Preview deployments:
--   flightdesk_vercel_bypass (Vercel Automation Bypass secret)
begin;
do $$ begin
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null or to_regclass('cron.job') is null then
    raise exception 'Enable Supabase Vault, pg_net and Cron first; no schedule was installed';
  end if;
end $$;
create schema if not exists flightdesk_private;
revoke all on schema flightdesk_private from public,anon,authenticated;
create or replace function flightdesk_private.invoke_translation_worker()
returns bigint language plpgsql security definer set search_path='' as $$
declare worker_url text; worker_secret text; bypass text; headers jsonb;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets where name='flightdesk_translation_worker_url';
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='flightdesk_translation_cron_secret';
  select decrypted_secret into bypass from vault.decrypted_secrets where name='flightdesk_vercel_bypass';
  if worker_url is null or worker_url !~ '^https://[A-Za-z0-9.-]+/api/internal/translations/process$'
    or worker_secret is null or char_length(worker_secret)<32 then
    raise exception 'Translation scheduler configuration missing or invalid';
  end if;
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_secret);
  if bypass is not null then headers:=headers||jsonb_build_object('x-vercel-protection-bypass',bypass); end if;
  return net.http_post(url:=worker_url,headers:=headers,body:='{}'::jsonb,timeout_milliseconds:=60000);
end; $$;
alter function flightdesk_private.invoke_translation_worker() owner to postgres;
revoke all on function flightdesk_private.invoke_translation_worker() from public,anon,authenticated,service_role;
-- Re-running replaces only this feature's own named schedule.
select cron.unschedule(jobid) from cron.job where jobname='flightdesk-content-translations';
select cron.schedule('flightdesk-content-translations','* * * * *','select flightdesk_private.invoke_translation_worker()');
commit;
