-- READ ONLY. Run after an explicitly approved import, never as an importer.
select version();

select status, airport_type, count(*) as airports,
       count(*) filter (where iata_code is null) as without_iata,
       count(*) filter (where icao_code is null) as without_icao,
       count(*) filter (where continent_code is null) as without_continent,
       count(*) filter (where timezone is null) as without_timezone,
       round(100.0 * count(timezone) / nullif(count(*), 0), 4) as timezone_match_percent
from public.airports group by status, airport_type order by status, airport_type;

select pg_size_pretty(pg_database_size(current_database())) as whole_database,
       pg_size_pretty(pg_table_size('public.airports')) as airport_heap_and_toast,
       pg_size_pretty(pg_indexes_size('public.airports')) as airport_indexes,
       pg_size_pretty(pg_total_relation_size('public.airports')) as airport_total;

select source, source_id, count(*) from public.airports
group by source, source_id having count(*) > 1;

select ident, name, iata_code, icao_code, latitude, longitude,
       country_code, continent_code, airport_type, timezone, timezone_source, source_version
from public.airports where iata_code in ('PEK','PKX','JFK','LHR','HND','LAX','KTM','ADL')
order by iata_code;

select has_table_privilege('anon', 'public.airports', 'SELECT') as anon_can_read,
       has_table_privilege('anon', 'public.airports', 'INSERT') as anon_can_insert,
       has_table_privilege('authenticated', 'public.airports', 'UPDATE') as user_can_update,
       has_table_privilege('authenticated', 'public.airports', 'DELETE') as user_can_delete,
       has_function_privilege('authenticated', 'public.validate_airport_reference()', 'EXECUTE') as user_can_call_trigger_function,
       has_function_privilege('anon', 'public.search_airports(text,integer)', 'EXECUTE') as anon_can_search;

select policyname, roles, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename='airports';

select * from public.search_airports('PEK', 12);
select * from public.search_airports('ZBAA', 12);
select * from public.search_airports('Beijing', 12);
select * from public.search_airports('New York', 12);
select * from public.search_airports('00AK', 12);

-- ANALYZE public.airports is a separate authorized maintenance step (not run here).
-- Repeat these to distinguish warm-cache timings from first-call timings.
explain (analyze, buffers) select * from public.search_airports('PEK', 12);
explain (analyze, buffers) select * from public.search_airports('New York', 12);
explain (analyze, buffers) select * from public.search_airports('United States', 12);

-- RPC may appear as Function Scan. Inspect the underlying indexable predicates too.
explain (analyze, buffers) select id from public.airports
where status='listed' and upper(iata_code) like 'PEK%' limit 20;
explain (analyze, buffers) select id from public.airports
where status='listed' and search_vector @@ to_tsquery('simple', 'new:* & york:*') limit 20;
