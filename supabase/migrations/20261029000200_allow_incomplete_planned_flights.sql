-- Planned Excel imports may legitimately have no date or local times yet.
-- Completed flights continue to be protected by the existing application
-- validation and status rules; this only removes the schema-level blocker for
-- an incomplete planned record.

ALTER TABLE public.flights
  ALTER COLUMN flight_date DROP NOT NULL;
