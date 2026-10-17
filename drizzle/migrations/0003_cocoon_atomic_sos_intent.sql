CREATE FUNCTION public.commit_sos_intent(p_owner uuid,p_request uuid,p_snapshot jsonb,p_note text,p_location jsonb,p_messages jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s public.emergency_sessions; m jsonb; rid uuid; k text; mid text; payload jsonb; ids uuid[]; BEGIN
PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text,2));
SELECT * INTO s FROM public.emergency_sessions WHERE traveller_id=p_owner AND request_key=p_request FOR UPDATE;
IF s.id IS NULL THEN
IF (SELECT count(*) FROM public.emergency_sessions WHERE traveller_id=p_owner AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'Emergency session limit reached'; END IF;
SELECT ARRAY(SELECT jsonb_array_elements_text(p_snapshot->'recipientIds')::uuid) INTO ids;
IF cardinality(ids)<1 OR cardinality(ids)>5 OR p_snapshot->>'travellerId'<>p_owner::text OR p_snapshot->>'status'<>'active' OR length(p_note)>500 THEN RAISE EXCEPTION 'Invalid emergency intent'; END IF;
PERFORM 1 FROM public.alert_preferences WHERE traveller_id=p_owner AND enabled->>'sos'='true' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'SOS rule is disabled'; END IF;
PERFORM 1 FROM public.guardian_enrollments WHERE id=ANY(ids) AND traveller_id=p_owner AND consent='opted_in' AND revoked_at IS NULL ORDER BY id FOR UPDATE;
IF (SELECT count(DISTINCT id) FROM public.guardian_enrollments WHERE id=ANY(ids) AND traveller_id=p_owner AND consent='opted_in' AND revoked_at IS NULL)<>cardinality(ids) THEN RAISE EXCEPTION 'Recipient consent unavailable'; END IF;
INSERT INTO public.emergency_sessions(id,traveller_id,request_key,payload,note,location) VALUES((p_snapshot->>'id')::uuid,p_owner,p_request,p_snapshot,p_note,p_location) RETURNING * INTO s;
END IF;
IF s.payload->>'status'<>'active' THEN RETURN s.id; END IF;
FOR m IN SELECT * FROM jsonb_array_elements(p_messages) LOOP
rid=(m->>'recipientId')::uuid;
IF NOT (s.payload->'recipientIds' ? rid::text) OR m->>'event'<>'sos' OR m->>'origin'<>'user_action' THEN RAISE EXCEPTION 'Invalid outbox intent'; END IF;
PERFORM 1 FROM public.guardian_enrollments WHERE id=rid AND traveller_id=p_owner AND consent='opted_in' AND revoked_at IS NULL FOR UPDATE; IF NOT FOUND THEN CONTINUE; END IF;
k=s.id::text||':sos:once:'||rid::text;mid=m->>'id';
payload=m||jsonb_build_object('tripId',s.id,'travellerId',p_owner,'idempotencyKey',k,'status','queued');
INSERT INTO public.notify_outbox(id,idempotency_key,trip_id,traveller_id,recipient_id,status,next_attempt_at,payload) VALUES(mid,k,s.id,p_owner,rid,'queued',now(),payload) ON CONFLICT(idempotency_key) DO NOTHING;
END LOOP;
RETURN s.id; END $$;
REVOKE ALL ON FUNCTION public.commit_sos_intent(uuid,uuid,jsonb,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.commit_sos_intent(uuid,uuid,jsonb,text,jsonb,jsonb) TO service_role;
