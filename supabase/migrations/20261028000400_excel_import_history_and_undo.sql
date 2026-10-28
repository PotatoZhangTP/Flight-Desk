-- Phase 1E: import history, per-row outcomes and safe undo.

CREATE UNIQUE INDEX IF NOT EXISTS flights_user_import_batch_row_key
  ON public.flights (user_id, import_batch_id, import_row_number)
  WHERE import_batch_id IS NOT NULL AND import_row_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.excel_import_batches (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT 'Excel import',
  total_records integer NOT NULL DEFAULT 0 CHECK (total_records >= 0),
  imported_count integer NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  skipped_count integer NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  already_imported_count integer NOT NULL DEFAULT 0 CHECK (already_imported_count >= 0),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','partially_completed','failed','undone')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.excel_import_batch_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.excel_import_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_row_number integer NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('imported','failed','skipped','already_imported')),
  created_by_batch boolean NOT NULL DEFAULT false,
  flight_id uuid REFERENCES public.flights(id) ON DELETE SET NULL,
  original_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_type text,
  error_message text,
  suggestion text,
  undo_status text CHECK (undo_status IS NULL OR undo_status IN ('undone','protected','missing')),
  undo_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, source_row_number)
);

CREATE INDEX IF NOT EXISTS excel_import_batches_user_created_idx
  ON public.excel_import_batches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS excel_import_batch_records_batch_idx
  ON public.excel_import_batch_records (batch_id, source_row_number);

ALTER TABLE public.excel_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_import_batch_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='excel_import_batches' AND policyname='Users can view their own import batches') THEN
    CREATE POLICY "Users can view their own import batches" ON public.excel_import_batches FOR SELECT USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='excel_import_batch_records' AND policyname='Users can view their own import records') THEN
    CREATE POLICY "Users can view their own import records" ON public.excel_import_batch_records FOR SELECT USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

GRANT SELECT ON public.excel_import_batches, public.excel_import_batch_records TO authenticated;

CREATE OR REPLACE FUNCTION public.import_flights_batch(
  p_batch_id uuid,
  p_rows jsonb,
  p_file_name text DEFAULT 'Excel import',
  p_total_records integer DEFAULT 0
)
RETURNS TABLE (row_number integer, result text, flight_id uuid, error_message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE
  item jsonb; payload jsonb; current_row integer; inserted_id uuid; existing_outcome text; batch_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
  IF p_batch_id IS NULL OR jsonb_typeof(p_rows) <> 'array' OR p_total_records < 0 OR p_total_records > 2000 THEN
    RAISE EXCEPTION 'Invalid import batch' USING ERRCODE='22023';
  END IF;

  SELECT user_id INTO batch_owner FROM public.excel_import_batches WHERE id=p_batch_id;
  IF batch_owner IS NOT NULL AND batch_owner <> auth.uid() THEN RAISE EXCEPTION 'Import batch is not yours' USING ERRCODE='42501'; END IF;
  INSERT INTO public.excel_import_batches (id,user_id,file_name,total_records,status)
  VALUES (p_batch_id,auth.uid(),left(coalesce(nullif(p_file_name,''),'Excel import'),255),p_total_records,'processing')
  ON CONFLICT (id) DO UPDATE SET file_name=excluded.file_name,total_records=excluded.total_records,updated_at=now()
    WHERE public.excel_import_batches.user_id=auth.uid();

  FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    current_row := nullif(item->>'row_number','')::integer;
    payload := coalesce(item->'data','{}'::jsonb);
    SELECT outcome INTO existing_outcome FROM public.excel_import_batch_records WHERE batch_id=p_batch_id AND source_row_number=current_row;
    IF existing_outcome IS NOT NULL AND existing_outcome <> 'failed' THEN
      row_number:=current_row; result:=existing_outcome; flight_id:=NULL; error_message:=NULL; RETURN NEXT; CONTINUE;
    END IF;
    IF existing_outcome = 'failed' THEN
      DELETE FROM public.excel_import_batch_records WHERE batch_id=p_batch_id AND source_row_number=current_row;
    END IF;
    BEGIN
      IF coalesce(item->>'preflight_result','')='skipped' THEN
        INSERT INTO public.excel_import_batch_records(batch_id,user_id,source_row_number,outcome,original_data,error_type,error_message,suggestion)
        VALUES(p_batch_id,auth.uid(),current_row,'skipped',payload,'review',item->>'error_message',coalesce(item->>'suggestion','Review this row before importing it.'));
        row_number:=current_row; result:='skipped'; flight_id:=NULL; error_message:=item->>'error_message'; RETURN NEXT; CONTINUE;
      END IF;
      IF coalesce(item->>'preflight_result','')='failed' THEN
        INSERT INTO public.excel_import_batch_records(batch_id,user_id,source_row_number,outcome,original_data,error_type,error_message,suggestion)
        VALUES(p_batch_id,auth.uid(),current_row,'failed',payload,coalesce(item->>'error_type','validation'),item->>'error_message',coalesce(item->>'suggestion','Correct the row and retry it.'));
        row_number:=current_row; result:='failed'; flight_id:=NULL; error_message:=item->>'error_message'; RETURN NEXT; CONTINUE;
      END IF;
      SELECT id INTO inserted_id FROM public.flights WHERE user_id=auth.uid() AND import_batch_id=p_batch_id AND import_row_number=current_row;
      IF inserted_id IS NOT NULL THEN
        INSERT INTO public.excel_import_batch_records(batch_id,user_id,source_row_number,outcome,created_by_batch,flight_id,original_data)
        VALUES(p_batch_id,auth.uid(),current_row,'already_imported',false,inserted_id,payload);
        row_number:=current_row; result:='already_imported'; flight_id:=inserted_id; error_message:=NULL; RETURN NEXT; CONTINUE;
      END IF;
      INSERT INTO public.flights(
        user_id,flight_date,flight_number,airline,departure_airport,arrival_airport,
        departure_airport_iata,departure_airport_icao,departure_airport_name,departure_country_code,departure_timezone,departure_local_date,departure_local_time,departure_scheduled_at_utc,
        arrival_airport_iata,arrival_airport_icao,arrival_airport_name,arrival_country_code,arrival_timezone,arrival_local_date,arrival_local_time,arrival_scheduled_at_utc,
        aircraft_type,registration,notes,scheduled_duration_minutes,actual_duration_minutes,status,source,is_user_modified,import_batch_id,import_row_number
      ) VALUES(
        auth.uid(),(payload->>'flight_date')::date,nullif(payload->>'flight_number',''),nullif(payload->>'airline',''),payload->>'departure_airport',payload->>'arrival_airport',
        nullif(payload->>'departure_airport_iata',''),nullif(payload->>'departure_airport_icao',''),payload->>'departure_airport_name',nullif(payload->>'departure_country_code',''),payload->>'departure_timezone',(payload->>'departure_local_date')::date,(payload->>'departure_local_time')::time,(payload->>'departure_scheduled_at_utc')::timestamptz,
        nullif(payload->>'arrival_airport_iata',''),nullif(payload->>'arrival_airport_icao',''),payload->>'arrival_airport_name',nullif(payload->>'arrival_country_code',''),payload->>'arrival_timezone',(payload->>'arrival_local_date')::date,(payload->>'arrival_local_time')::time,(payload->>'arrival_scheduled_at_utc')::timestamptz,
        nullif(payload->>'aircraft_type',''),nullif(payload->>'registration',''),nullif(payload->>'notes',''),(payload->>'scheduled_duration_minutes')::integer,(payload->>'actual_duration_minutes')::integer,coalesce(nullif(payload->>'status',''),'completed'),coalesce(nullif(payload->>'source',''),'manual'),coalesce((payload->>'is_user_modified')::boolean,false),p_batch_id,current_row
      ) RETURNING id INTO inserted_id;
      INSERT INTO public.excel_import_batch_records(batch_id,user_id,source_row_number,outcome,created_by_batch,flight_id,original_data)
      VALUES(p_batch_id,auth.uid(),current_row,'imported',true,inserted_id,payload);
      row_number:=current_row; result:='imported'; flight_id:=inserted_id; error_message:=NULL; RETURN NEXT;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO inserted_id FROM public.flights WHERE user_id=auth.uid() AND import_batch_id=p_batch_id AND import_row_number=current_row;
      INSERT INTO public.excel_import_batch_records(batch_id,user_id,source_row_number,outcome,created_by_batch,flight_id,original_data,error_type,error_message)
      VALUES(p_batch_id,auth.uid(),current_row,'already_imported',false,inserted_id,payload,'duplicate_batch_row','This row was already imported.');
      row_number:=current_row; result:='already_imported'; flight_id:=inserted_id; error_message:=NULL; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.excel_import_batch_records(batch_id,user_id,source_row_number,outcome,original_data,error_type,error_message,suggestion)
      VALUES(p_batch_id,auth.uid(),current_row,'failed',payload,'database',sqlerrm,'Check the row values and retry this record.');
      row_number:=current_row; result:='failed'; flight_id:=NULL; error_message:=sqlerrm; RETURN NEXT;
    END;
  END LOOP;
  UPDATE public.excel_import_batches b SET imported_count=(SELECT count(*) FROM public.excel_import_batch_records r WHERE r.batch_id=b.id AND r.outcome='imported'), failed_count=(SELECT count(*) FROM public.excel_import_batch_records r WHERE r.batch_id=b.id AND r.outcome='failed'), skipped_count=(SELECT count(*) FROM public.excel_import_batch_records r WHERE r.batch_id=b.id AND r.outcome='skipped'), already_imported_count=(SELECT count(*) FROM public.excel_import_batch_records r WHERE r.batch_id=b.id AND r.outcome='already_imported'), status=CASE WHEN (SELECT count(*) FROM public.excel_import_batch_records r WHERE r.batch_id=b.id AND r.outcome='failed')=0 THEN 'completed' WHEN (SELECT count(*) FROM public.excel_import_batch_records r WHERE r.batch_id=b.id AND r.outcome='imported')>0 THEN 'partially_completed' ELSE 'failed' END,updated_at=now() WHERE b.id=p_batch_id AND b.user_id=auth.uid();
END;
$function$;

ALTER FUNCTION public.import_flights_batch(uuid,jsonb,text,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.import_flights_batch(uuid,jsonb,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_flights_batch(uuid,jsonb,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_excel_import_batch(p_batch_id uuid)
RETURNS TABLE(undone_count integer, protected_count integer, missing_count integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE batch_owner uuid; batch_created timestamptz; record_row record; removed integer:=0; protected integer:=0; missing integer:=0; remaining integer;
BEGIN
  SELECT user_id,created_at INTO batch_owner,batch_created FROM public.excel_import_batches WHERE id=p_batch_id;
  IF batch_owner IS NULL OR batch_owner<>auth.uid() THEN RAISE EXCEPTION 'Import batch is unavailable' USING ERRCODE='42501'; END IF;
  SELECT count(*) FILTER (WHERE undo_status='protected')::integer, count(*) FILTER (WHERE undo_status='missing')::integer
  INTO protected, missing
  FROM public.excel_import_batch_records
  WHERE batch_id=p_batch_id AND user_id=auth.uid() AND created_by_batch=true;
  FOR record_row IN SELECT r.id,r.flight_id,f.updated_at FROM public.excel_import_batch_records r LEFT JOIN public.flights f ON f.id=r.flight_id AND f.user_id=auth.uid() WHERE r.batch_id=p_batch_id AND r.user_id=auth.uid() AND r.outcome='imported' AND r.created_by_batch=true AND r.undo_status IS NULL LOOP
    IF record_row.flight_id IS NULL THEN UPDATE public.excel_import_batch_records SET undo_status='missing',undo_reason='The created flight no longer exists.' WHERE id=record_row.id; missing:=missing+1;
    ELSIF record_row.updated_at>batch_created THEN UPDATE public.excel_import_batch_records SET undo_status='protected',undo_reason='The flight was edited after import.' WHERE id=record_row.id; protected:=protected+1;
    ELSE DELETE FROM public.flights WHERE id=record_row.flight_id AND user_id=auth.uid() AND import_batch_id=p_batch_id; IF FOUND THEN UPDATE public.excel_import_batch_records SET undo_status='undone' WHERE id=record_row.id; removed:=removed+1; ELSE UPDATE public.excel_import_batch_records SET undo_status='missing',undo_reason='The flight could not be found for safe removal.' WHERE id=record_row.id; missing:=missing+1; END IF; END IF;
  END LOOP;
  SELECT count(*) INTO remaining FROM public.excel_import_batch_records WHERE batch_id=p_batch_id AND outcome='imported' AND created_by_batch=true AND undo_status IS NULL;
  UPDATE public.excel_import_batches SET status=CASE WHEN remaining=0 AND protected=0 AND missing=0 THEN 'undone' ELSE 'partially_completed' END,updated_at=now() WHERE id=p_batch_id AND user_id=auth.uid();
  RETURN QUERY SELECT removed,protected,missing,(SELECT b.status FROM public.excel_import_batches b WHERE b.id=p_batch_id);
END;
$function$;

ALTER FUNCTION public.undo_excel_import_batch(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.undo_excel_import_batch(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.undo_excel_import_batch(uuid) TO authenticated;
