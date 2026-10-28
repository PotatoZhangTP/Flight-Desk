-- Safe, idempotent Excel batch import support.
-- The client must validate and normalize records first; this function only
-- accepts the same normalized columns used by the existing flight save path.

create unique index if not exists flights_user_import_batch_row_key
  on public.flights (user_id, import_batch_id, import_row_number)
  where import_batch_id is not null and import_row_number is not null;

create or replace function public.import_flights_batch(
  p_batch_id uuid,
  p_rows jsonb
)
returns table (
  row_number integer,
  result text,
  flight_id uuid,
  error_message text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  item jsonb;
  payload jsonb;
  current_row integer;
  inserted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_batch_id is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Invalid import batch' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 2000 then
    raise exception 'Import batch is too large' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    current_row := nullif(item->>'row_number', '')::integer;
    payload := coalesce(item->'data', '{}'::jsonb);
    begin
      select id into inserted_id
      from public.flights
      where user_id = auth.uid()
        and import_batch_id = p_batch_id
        and import_row_number = current_row;

      if inserted_id is not null then
        row_number := current_row; result := 'already_imported'; flight_id := inserted_id; error_message := null; return next;
        continue;
      end if;

      insert into public.flights (
        user_id, flight_date, flight_number, airline,
        departure_airport, arrival_airport,
        departure_airport_iata, departure_airport_icao, departure_airport_name, departure_country_code, departure_timezone, departure_local_date, departure_local_time, departure_scheduled_at_utc,
        arrival_airport_iata, arrival_airport_icao, arrival_airport_name, arrival_country_code, arrival_timezone, arrival_local_date, arrival_local_time, arrival_scheduled_at_utc,
        aircraft_type, registration, notes, scheduled_duration_minutes, actual_duration_minutes, status, source, is_user_modified,
        import_batch_id, import_row_number
      ) values (
        auth.uid(), (payload->>'flight_date')::date, nullif(payload->>'flight_number', ''), nullif(payload->>'airline', ''),
        payload->>'departure_airport', payload->>'arrival_airport',
        nullif(payload->>'departure_airport_iata', ''), nullif(payload->>'departure_airport_icao', ''), payload->>'departure_airport_name', nullif(payload->>'departure_country_code', ''), payload->>'departure_timezone', (payload->>'departure_local_date')::date, (payload->>'departure_local_time')::time, (payload->>'departure_scheduled_at_utc')::timestamptz,
        nullif(payload->>'arrival_airport_iata', ''), nullif(payload->>'arrival_airport_icao', ''), payload->>'arrival_airport_name', nullif(payload->>'arrival_country_code', ''), payload->>'arrival_timezone', (payload->>'arrival_local_date')::date, (payload->>'arrival_local_time')::time, (payload->>'arrival_scheduled_at_utc')::timestamptz,
        nullif(payload->>'aircraft_type', ''), nullif(payload->>'registration', ''), nullif(payload->>'notes', ''), (payload->>'scheduled_duration_minutes')::integer, (payload->>'actual_duration_minutes')::integer, coalesce(nullif(payload->>'status', ''), 'completed'), coalesce(nullif(payload->>'source', ''), 'manual'), coalesce((payload->>'is_user_modified')::boolean, false),
        p_batch_id, current_row
      ) returning id into inserted_id;
      row_number := current_row; result := 'imported'; flight_id := inserted_id; error_message := null; return next;
    exception when others then
      row_number := current_row; result := 'failed'; flight_id := null; error_message := sqlerrm; return next;
    end;
  end loop;
end;
$function$;

alter function public.import_flights_batch(uuid, jsonb) owner to postgres;
revoke all on function public.import_flights_batch(uuid, jsonb) from public, anon;
grant execute on function public.import_flights_batch(uuid, jsonb) to authenticated;
