CREATE TABLE public.emergency_drafts (traveller_id uuid PRIMARY KEY, introduction text NOT NULL DEFAULT '', help_instructions text NOT NULL DEFAULT '', preferred_recipient_ids uuid[] NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.emergency_drafts TO authenticated;
GRANT ALL ON public.emergency_drafts TO service_role;
ALTER TABLE public.emergency_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY emergency_draft_owner ON public.emergency_drafts FOR SELECT TO authenticated USING(traveller_id=auth.uid());
ALTER TABLE public.inapp_alerts ADD COLUMN introduction text NOT NULL DEFAULT '', ADD COLUMN help_instructions text NOT NULL DEFAULT '', ADD COLUMN draft_included boolean NOT NULL DEFAULT false, ADD COLUMN prepared_at timestamptz, ADD COLUMN recipient_name text NOT NULL DEFAULT 'Guardian';
CREATE FUNCTION public.write_emergency_draft(p_delete boolean,p_introduction text,p_help text,p_recipients uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); g public.inapp_guardians; n integer:=0; BEGIN
IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified sign-in required'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('emergency-draft:'||actor::text,0));
IF p_delete IS TRUE THEN DELETE FROM public.emergency_drafts WHERE traveller_id=actor; RETURN; END IF;
IF p_introduction IS NULL OR length(p_introduction)>300 OR p_help IS NULL OR length(p_help)>500 OR cardinality(p_recipients) IS NULL OR cardinality(p_recipients)>5 OR array_position(p_recipients,NULL) IS NOT NULL OR cardinality(p_recipients)<>(SELECT count(DISTINCT x) FROM unnest(p_recipients) x) THEN RAISE EXCEPTION 'Invalid emergency draft'; END IF;
FOR g IN SELECT * FROM public.inapp_guardians WHERE id=ANY(p_recipients) ORDER BY id FOR UPDATE LOOP
IF g.traveller_id<>actor OR g.recipient_id IS NULL OR g.consent<>'opted_in' OR g.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Select only currently consenting guardians'; END IF; n:=n+1;
END LOOP;
IF n<>cardinality(p_recipients) THEN RAISE EXCEPTION 'Select only currently consenting guardians'; END IF;
INSERT INTO public.emergency_drafts(traveller_id,introduction,help_instructions,preferred_recipient_ids) VALUES(actor,p_introduction,p_help,p_recipients) ON CONFLICT(traveller_id) DO UPDATE SET introduction=excluded.introduction,help_instructions=excluded.help_instructions,preferred_recipient_ids=excluded.preferred_recipient_ids,updated_at=clock_timestamp();
END $$;
REVOKE ALL ON FUNCTION public.write_emergency_draft(boolean,text,text,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.write_emergency_draft(boolean,text,text,uuid[]) TO authenticated;
CREATE FUNCTION public.retire_emergency_preference() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.revoked_at IS NOT NULL OR NEW.consent<>'opted_in' THEN UPDATE public.emergency_drafts SET preferred_recipient_ids=array_remove(preferred_recipient_ids,NEW.id),updated_at=clock_timestamp() WHERE traveller_id=NEW.traveller_id AND NEW.id=ANY(preferred_recipient_ids); END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.retire_emergency_preference() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER retire_emergency_preference AFTER UPDATE OF consent,revoked_at ON public.inapp_guardians FOR EACH ROW EXECUTE FUNCTION public.retire_emergency_preference();
CREATE FUNCTION public.send_inapp_sos_snapshot(p_request uuid,p_recipients uuid[],p_note text,p_location jsonb,p_location_consent boolean,p_content jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); ids uuid[]; g public.inapp_guardians; found_count integer:=0; session_id uuid; payload_value jsonb; previous jsonb; display_value text; prepared timestamptz; BEGIN
IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified sign-in required'; END IF;
IF p_request IS NULL OR p_note IS NULL OR length(p_note)>500 OR cardinality(p_recipients) IS NULL OR cardinality(p_recipients) NOT BETWEEN 1 AND 5 OR array_position(p_recipients,NULL) IS NOT NULL OR cardinality(p_recipients)<>(SELECT count(DISTINCT x) FROM unnest(p_recipients) x) THEN RAISE EXCEPTION 'Invalid SOS request'; END IF;
IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p_content))<>5 OR NOT(p_content ?& ARRAY['introduction','helpInstructions','includeDraft','senderName','preparedAt']) OR jsonb_typeof(p_content->'introduction')<>'string' OR length(p_content->>'introduction')>300 OR jsonb_typeof(p_content->'helpInstructions')<>'string' OR length(p_content->>'helpInstructions')>500 OR jsonb_typeof(p_content->'includeDraft')<>'boolean' OR jsonb_typeof(p_content->'senderName')<>'string' OR length(p_content->>'senderName') NOT BETWEEN 1 AND 60 OR jsonb_typeof(p_content->'preparedAt')<>'string' THEN RAISE EXCEPTION 'Invalid reviewed snapshot'; END IF;
IF (p_content->>'includeDraft')::boolean IS FALSE AND (p_content->>'introduction'<>'' OR p_content->>'helpInstructions'<>'') THEN RAISE EXCEPTION 'Omitted draft must contain no introduction or instructions'; END IF;
prepared:=(p_content->>'preparedAt')::timestamptz;
PERFORM public.validate_journey_location(p_location,p_location_consent);
IF p_location='null'::jsonb THEN p_location:=NULL; END IF;
SELECT array_agg(x ORDER BY x) INTO ids FROM unnest(p_recipients) x;
PERFORM pg_advisory_xact_lock(hashtextextended('inapp-sos:'||actor::text||':'||p_request::text,0));
FOR g IN SELECT * FROM public.inapp_guardians WHERE id=ANY(ids) ORDER BY id FOR UPDATE LOOP
IF g.traveller_id<>actor OR g.recipient_id IS NULL OR g.consent<>'opted_in' OR g.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Select only your opted-in in-app guardians'; END IF; found_count:=found_count+1;
END LOOP;
IF found_count<>cardinality(ids) THEN RAISE EXCEPTION 'Select only your opted-in in-app guardians'; END IF;
payload_value:=jsonb_build_object('recipientIds',to_jsonb(ids),'note',p_note,'location',p_location,'content',p_content,'senderId',actor);
SELECT id,request_payload INTO session_id,previous FROM public.inapp_sos WHERE traveller_id=actor AND request_key=p_request;
IF session_id IS NOT NULL THEN IF previous<>payload_value THEN RAISE EXCEPTION 'Request key already used; start a new SOS for changes'; END IF; RETURN jsonb_build_object('id',session_id,'count',cardinality(ids),'duplicate',true); END IF;
SELECT coalesce(display_name,'Traveller') INTO display_value FROM public.profiles WHERE id=actor;
display_value:=coalesce(display_value,'Traveller');
IF p_content->>'senderName'<>display_value OR prepared>clock_timestamp()+interval '10 seconds' OR prepared<clock_timestamp()-interval '10 minutes' THEN RAISE EXCEPTION 'Refresh sender identity and review timestamp'; END IF;
INSERT INTO public.inapp_sos(traveller_id,request_key,request_payload) VALUES(actor,p_request,payload_value) RETURNING id INTO session_id;
INSERT INTO public.inapp_alerts(sos_id,traveller_id,enrollment_id,recipient_id,traveller_name,note,location,introduction,help_instructions,draft_included,prepared_at,recipient_name)
SELECT session_id,actor,id,recipient_id,display_value,p_note,p_location,p_content->>'introduction',p_content->>'helpInstructions',(p_content->>'includeDraft')::boolean,prepared,name FROM public.inapp_guardians WHERE id=ANY(ids);
RETURN jsonb_build_object('id',session_id,'count',cardinality(ids),'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.send_inapp_sos_snapshot(uuid,uuid[],text,jsonb,boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_inapp_sos_snapshot(uuid,uuid[],text,jsonb,boolean,jsonb) TO authenticated;
COMMENT ON TABLE public.emergency_drafts IS 'Owner-only optional emergency introduction and help preferences. Never public or automatically included. Revoked preferred enrollment IDs are removed permanently.';
COMMENT ON COLUMN public.inapp_alerts.introduction IS 'Immutable user-reviewed optional snapshot, not a live link to the owner draft. Recipient RLS and consent revocation still apply.';
