-- ONLY run in Flight Desk Test, as postgres. Not in the Production project.
-- 24 reviewed real records; OurAirports public domain.
-- Timezone boundaries: timezone-boundary-builder 2026e / OpenStreetMap, ODbL 1.0.
-- No credentials, migrations, deletes or business-table changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

with sample (source_id, ident, name, icao_code, iata_code, gps_code, local_code, municipality, country_code, country_name, region_code, timezone, latitude, longitude, airport_type, scheduled_service, status) as (
  values
    (2434, 'EGLL', 'London Heathrow Airport', 'EGLL', 'LHR', 'EGLL', null, 'London', 'GB', 'United Kingdom', 'GB-ENG', 'Europe/London', 51.470748, -0.459909, 'large_airport', true, 'listed'),
    (3622, 'KJFK', 'John F. Kennedy International Airport', 'KJFK', 'JFK', 'KJFK', 'JFK', 'New York', 'US', 'United States', 'US-NY', 'America/New_York', 40.639447, -73.779317, 'large_airport', true, 'listed'),
    (3632, 'KLAX', 'Los Angeles International Airport', 'KLAX', 'LAX', 'KLAX', 'LAX', 'Los Angeles', 'US', 'United States', 'US-CA', 'America/Los_Angeles', 33.942501, -118.407997, 'large_airport', true, 'listed'),
    (5627, 'RJTT', 'Tokyo Haneda International Airport', 'RJTT', 'HND', 'RJTT', null, 'Tokyo', 'JP', 'Japan', 'JP-13', 'Asia/Tokyo', 35.549678, 139.786958, 'large_airport', true, 'listed'),
    (26596, 'VNKT', 'Tribhuvan International Airport', 'VNKT', 'KTM', 'VNKT', null, 'Kathmandu', 'NP', 'Nepal', 'NP-P3', 'Asia/Kathmandu', 27.6966, 85.3591, 'large_airport', true, 'listed'),
    (27096, 'YPAD', 'Adelaide International Airport', 'YPAD', 'ADL', 'YPAD', null, 'Adelaide', 'AU', 'Australia', 'AU-SA', 'Australia/Adelaide', -34.947512, 138.533393, 'large_airport', true, 'listed'),
    (27188, 'ZBAA', 'Beijing Capital International Airport', 'ZBAA', 'PEK', 'ZBAA', null, 'Beijing', 'CN', 'China', 'CN-11', 'Asia/Shanghai', 40.077349, 116.596702, 'large_airport', true, 'listed'),
    (330820, 'ZBAD', 'Beijing Daxing International Airport', 'ZBAD', 'PKX', 'ZBAD', null, 'Beijing', 'CN', 'China', 'CN-11', 'Asia/Shanghai', 39.501289, 116.413967, 'large_airport', true, 'listed'),
    (323361, '00AA', 'Aero B Ranch Airport', null, null, '00AA', '00AA', 'Leoti', 'US', 'United States', 'US-KS', 'America/Chicago', 38.704022, -101.473911, 'small_airport', false, 'listed'),
    (6524, '00AK', 'Lowell Field', null, null, '00AK', '00AK', 'Anchor Point', 'US', 'United States', 'US-AK', 'America/Anchorage', 59.947733, -151.692524, 'small_airport', false, 'listed'),
    (6525, '00AL', 'Epps Airpark', null, null, '00AL', '00AL', 'Harvest', 'US', 'United States', 'US-AL', 'America/Chicago', 34.86479949951172, -86.77030181884766, 'small_airport', false, 'listed'),
    (6523, '00A', 'Total RF Heliport', null, null, 'K00A', '00A', 'Bensalem', 'US', 'United States', 'US-PA', 'America/New_York', 40.070985, -74.933689, 'heliport', false, 'listed'),
    (322658, '00CN', 'Kitchen Creek Helibase Heliport', null, null, '00CN', '00CN', 'Pine Valley', 'US', 'United States', 'US-CA', 'America/Los_Angeles', 32.7273736, -116.4597417, 'heliport', false, 'listed'),
    (6535, '00GE', 'Caffrey Heliport', null, null, '00GE', '00GE', 'Hiram', 'US', 'United States', 'US-GA', 'America/New_York', 33.887982, -84.736983, 'heliport', false, 'listed'),
    (516263, 'AE-0221', 'Sas Al Nakheel Air Base', 'OMNK', null, 'OMNK', null, 'Sas Al Nakheel', 'AE', 'United Arab Emirates', 'AE-AZ', 'Asia/Dubai', 24.44128, 54.51696, 'medium_airport', false, 'listed'),
    (603000, 'AQ-0016', 'Grandfather Skiway', null, null, null, null, 'Antartica', 'AQ', 'Antarctica', 'AQ-U-A', 'Antarctica/Rothera', -77.530242, -31.827393, 'medium_airport', false, 'listed'),
    (336951, 'AQBC', 'Boulder Clay Runway', null, null, 'AQBC', null, 'Zucchelli Station', 'AQ', 'Antarctica', 'AQ-U-A', 'Antarctica/McMurdo', -74.739373, 164.03539, 'medium_airport', false, 'listed'),
    (321919, '00NK', 'Cliche Cove Seaplane Base', null, null, '00NK', '00NK', 'Beekmantown', 'US', 'United States', 'US-NY', 'America/New_York', 44.8118612, -73.3698057, 'seaplane_base', false, 'listed'),
    (6605, '01MD', 'Annapolis Seaplane Base', null, null, '01MD', '01MD', 'Annapolis', 'US', 'United States', 'US-MD', 'America/New_York', 38.999199, -76.456001, 'seaplane_base', false, 'listed'),
    (6606, '01ME', 'Saint Peter''s Seaplane Base', null, null, '01ME', '01ME', 'Portage Lake', 'US', 'United States', 'US-ME', 'America/New_York', 46.778900146484375, -68.50029754638672, 'seaplane_base', false, 'listed'),
    (7767, '12JY', 'Clinton Elks Lodge Balloonport', null, null, '12JY', '12JY', 'Pittstown', 'US', 'United States', 'US-NJ', 'America/New_York', 40.604587, -74.921538, 'balloonport', false, 'listed'),
    (7829, '13M', 'Aeronut Park Balloonport', null, null, '13M', '13M', 'Howell', 'US', 'United States', 'US-MI', 'America/Detroit', 42.604198, -83.858597, 'balloonport', false, 'listed'),
    (9213, '28NC', 'Balloonport of Greensboro Balloonport', null, null, '28NC', '28NC', 'Greensboro', 'US', 'United States', 'US-NC', 'America/New_York', 35.9557991027832, -79.81890106201172, 'balloonport', false, 'listed'),
    (6541, '00IS', 'Hayenga''s Cant Find Farms Airport', null, null, null, null, 'Kings', 'US', 'United States', 'US-IL', 'America/Chicago', 40.0256, -89.122902, 'closed', false, 'closed')
)
insert into public.airports as target (
  source, source_version, source_id, ident, name, icao_code, iata_code, gps_code, local_code, municipality, country_code, country_name, region_code, timezone, latitude, longitude, airport_type, scheduled_service, status, timezone_source
)
select
  'ourairports', '81d442d8361677cc3134bb18120409b1898c18ba',
  source_id, ident, name, icao_code, iata_code, gps_code, local_code, municipality, country_code, country_name, region_code, timezone, latitude, longitude, airport_type, scheduled_service, status,
  'timezone-boundary-builder:2026e:comprehensive-land:point-in-polygon'
from sample
on conflict (source, source_id) do update set
  source_version = excluded.source_version,
  ident = excluded.ident,
  name = excluded.name,
  icao_code = excluded.icao_code,
  iata_code = excluded.iata_code,
  gps_code = excluded.gps_code,
  local_code = excluded.local_code,
  municipality = excluded.municipality,
  country_code = excluded.country_code,
  country_name = excluded.country_name,
  region_code = excluded.region_code,
  timezone = case when target.timezone_source like 'reviewed:%' then target.timezone else excluded.timezone end,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  airport_type = excluded.airport_type,
  scheduled_service = excluded.scheduled_service,
  status = excluded.status,
  timezone_source = case when target.timezone_source like 'reviewed:%' then target.timezone_source else excluded.timezone_source end,
  imported_at = now()
where row(target.source_version, target.ident, target.name, target.icao_code, target.iata_code, target.gps_code, target.local_code, target.municipality, target.country_code, target.country_name, target.region_code, target.timezone, target.latitude, target.longitude, target.airport_type, target.scheduled_service, target.status, target.timezone_source)
  is distinct from row(excluded.source_version, excluded.ident, excluded.name, excluded.icao_code, excluded.iata_code, excluded.gps_code, excluded.local_code, excluded.municipality, excluded.country_code, excluded.country_name, excluded.region_code, case when target.timezone_source like 'reviewed:%' then target.timezone else excluded.timezone end, excluded.latitude, excluded.longitude, excluded.airport_type, excluded.scheduled_service, excluded.status, case when target.timezone_source like 'reviewed:%' then target.timezone_source else excluded.timezone_source end);

do $$
declare
  imported_count integer;
  code text;
  top_code text;
begin
  select count(*) into imported_count
  from public.airports
  where source = 'ourairports'
    and source_id = any(array[2434, 3622, 3632, 5627, 26596, 27096, 27188, 330820, 323361, 6524, 6525, 6523, 322658, 6535, 516263, 603000, 336951, 321919, 6605, 6606, 7767, 7829, 9213, 6541]::bigint[]);
  if imported_count <> 24 then
    raise exception 'Sample count verification failed; transaction will roll back';
  end if;
  foreach code in array array['PEK','PKX','JFK','LHR','HND','LAX','KTM','ADL'] loop
    select r.iata_code into top_code
    from public.search_airports(code, 12) as r
    limit 1;
    if top_code is distinct from code then
      raise exception 'Sample search verification failed; transaction will roll back';
    end if;
  end loop;
end;
$$;

commit;

-- Read-only result display.
select ident, name, iata_code, icao_code, country_code, timezone, status
from public.airports
where source = 'ourairports'
  and source_id = any(array[2434, 3622, 3632, 5627, 26596, 27096, 27188, 330820, 323361, 6524, 6525, 6523, 322658, 6535, 516263, 603000, 336951, 321919, 6605, 6606, 7767, 7829, 9213, 6541]::bigint[])
order by source_id;
