-- Prevent optional blank Excel values from being cast as typed empty strings.
-- Planned flights may omit dates and times; PostgreSQL must receive NULL for
-- those optional date/time columns rather than ''.

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
        auth.uid(),nullif(payload->>'flight_date','')::date,nullif(payload->>'flight_number',''),nullif(payload->>'airline',''),payload->>'departure_airport',payload->>'arrival_airport',
        nullif(payload->>'departure_airport_iata',''),nullif(payload->>'departure_airport_icao',''),payload->>'departure_airport_name',nullif(payload->>'departure_country_code',''),payload->>'departure_timezone',nullif(payload->>'departure_local_date','')::date,nullif(payload->>'departure_local_time','')::time,nullif(payload->>'departure_scheduled_at_utc','')::timestamptz,
        nullif(payload->>'arrival_airport_iata',''),nullif(payload->>'arrival_airport_icao',''),payload->>'arrival_airport_name',nullif(payload->>'arrival_country_code',''),payload->>'arrival_timezone',nullif(payload->>'arrival_local_date','')::date,nullif(payload->>'arrival_local_time','')::time,nullif(payload->>'arrival_scheduled_at_utc','')::timestamptz,
        nullif(payload->>'aircraft_type',''),nullif(payload->>'registration',''),nullif(payload->>'notes',''),nullif(payload->>'scheduled_duration_minutes','')::integer,nullif(payload->>'actual_duration_minutes','')::integer,coalesce(nullif(payload->>'status',''),'completed'),coalesce(nullif(payload->>'source',''),'manual'),coalesce(nullif(payload->>'is_user_modified','')::boolean,false),p_batch_id,current_row
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
