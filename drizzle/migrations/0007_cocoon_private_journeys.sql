ALTER TABLE public.inapp_guardians ADD COLUMN journey_opt_in boolean NOT NULL DEFAULT false;
GRANT SELECT(journey_opt_in) ON public.inapp_guardians TO authenticated;
CREATE FUNCTION public.set_journey_consent(p_id uuid,p_consent boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF auth.uid() IS NULL OR p_consent IS NULL THEN RAISE EXCEPTION 'Sign-in required'; END IF;
UPDATE public.inapp_guardians SET journey_opt_in=p_consent WHERE id=p_id AND recipient_id=auth.uid() AND consent='opted_in' AND revoked_at IS NULL;
IF NOT FOUND THEN RAISE EXCEPTION 'Connection unavailable'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_journey_consent(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_journey_consent(uuid,boolean) TO authenticated;
CREATE TABLE public.private_journeys(
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),traveller_id uuid NOT NULL,destination text NOT NULL,expected_at timestamptz NOT NULL,
status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','arrived','cancelled')),sharing boolean NOT NULL DEFAULT true,
note text NOT NULL DEFAULT '',location jsonb,last_check_in_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.private_journeys TO authenticated; GRANT ALL ON public.private_journeys TO service_role;
ALTER TABLE public.private_journeys ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.journey_shares(journey_id uuid NOT NULL REFERENCES public.private_journeys(id),enrollment_id uuid NOT NULL REFERENCES public.inapp_guardians(id),PRIMARY KEY(journey_id,enrollment_id));
GRANT SELECT ON public.journey_shares TO authenticated; GRANT ALL ON public.journey_shares TO service_role;
ALTER TABLE public.journey_shares ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.journey_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),journey_id uuid NOT NULL REFERENCES public.private_journeys(id),traveller_id uuid NOT NULL,action text NOT NULL,note text NOT NULL,location jsonb,expected_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.journey_events TO authenticated; GRANT ALL ON public.journey_events TO service_role;
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY journey_events_owner ON public.journey_events FOR SELECT TO authenticated USING(traveller_id=auth.uid());
CREATE TABLE public.journey_requests(traveller_id uuid NOT NULL,request_key uuid NOT NULL,payload jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(traveller_id,request_key));
GRANT SELECT ON public.journey_requests TO authenticated; GRANT ALL ON public.journey_requests TO service_role;
ALTER TABLE public.journey_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY journey_requests_owner ON public.journey_requests FOR SELECT TO authenticated USING(traveller_id=auth.uid());
CREATE FUNCTION public.can_read_journey(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.private_journeys j JOIN public.journey_shares s ON s.journey_id=j.id JOIN public.inapp_guardians g ON g.id=s.enrollment_id WHERE j.id=p_id AND j.sharing AND j.status='active' AND g.recipient_id=auth.uid() AND g.traveller_id=j.traveller_id AND g.consent='opted_in' AND g.revoked_at IS NULL AND g.journey_opt_in)
$$;
REVOKE ALL ON FUNCTION public.can_read_journey(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.can_read_journey(uuid) TO authenticated;
CREATE POLICY journey_owner ON public.private_journeys FOR SELECT TO authenticated USING(traveller_id=auth.uid());
CREATE POLICY journey_recipient ON public.private_journeys FOR SELECT TO authenticated USING(public.can_read_journey(id));
CREATE POLICY journey_share_owner ON public.journey_shares FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.private_journeys j WHERE j.id=journey_shares.journey_id AND j.traveller_id=auth.uid()));
CREATE UNIQUE INDEX journey_one_active ON public.private_journeys(traveller_id) WHERE status='active';
CREATE INDEX journey_owner_history ON public.private_journeys(traveller_id,created_at DESC);
CREATE FUNCTION public.validate_journey_location(p_location jsonb,p_consent boolean) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE stamp numeric; BEGIN
IF p_location IS NULL OR p_location='null'::jsonb THEN RETURN NULL; END IF;
IF p_consent IS DISTINCT FROM true OR jsonb_typeof(p_location)<>'object' THEN RAISE EXCEPTION 'Location requires consent and a fresh one-time fix'; END IF;
IF (SELECT count(*) FROM jsonb_object_keys(p_location))<>4 OR NOT(p_location ?& ARRAY['latitude','longitude','accuracy','timestamp']) OR jsonb_typeof(p_location->'latitude')<>'number' OR jsonb_typeof(p_location->'longitude')<>'number' OR jsonb_typeof(p_location->'accuracy')<>'number' OR jsonb_typeof(p_location->'timestamp')<>'number' THEN RAISE EXCEPTION 'Location requires consent and a fresh one-time fix'; END IF;
stamp:=(p_location->>'timestamp')::numeric;
IF (p_location->>'latitude')::numeric NOT BETWEEN -90 AND 90 OR (p_location->>'longitude')::numeric NOT BETWEEN -180 AND 180 OR (p_location->>'accuracy')::numeric NOT BETWEEN 0 AND 100000 OR stamp<>trunc(stamp) OR stamp>extract(epoch FROM clock_timestamp())*1000+10000 OR stamp<extract(epoch FROM clock_timestamp())*1000-120000 THEN RAISE EXCEPTION 'Location requires consent and a fresh one-time fix'; END IF;
RETURN p_location; END $$;
REVOKE ALL ON FUNCTION public.validate_journey_location(jsonb,boolean) FROM PUBLIC,anon;
CREATE FUNCTION public.write_private_journey(p_request uuid,p_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); kind text:=p_payload->>'action'; j public.private_journeys; g public.inapp_guardians; ids uuid[]; found_count integer:=0; loc jsonb; due timestamptz; previous public.journey_requests; result_value jsonb; BEGIN
IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified sign-in required'; END IF;
IF p_request IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR kind IS NULL OR kind NOT IN ('start','check_in','arrived','cancelled','stop_sharing') OR coalesce(length(p_payload->>'note'),0)>500 THEN RAISE EXCEPTION 'Invalid journey request'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('journey-owner:'||actor::text,0));
SELECT * INTO previous FROM public.journey_requests WHERE traveller_id=actor AND request_key=p_request;
IF previous.request_key IS NOT NULL THEN
IF previous.payload<>p_payload THEN RAISE EXCEPTION 'Request key already used for different input'; END IF;
RETURN previous.result||jsonb_build_object('duplicate',true);
END IF;
IF (SELECT count(*) FROM public.journey_requests WHERE traveller_id=actor AND created_at>now()-interval '1 day')>=200 THEN RAISE EXCEPTION 'Maximum 200 journey actions per day'; END IF;
loc:=public.validate_journey_location(p_payload->'location',coalesce((p_payload->>'locationConsent')::boolean,false));
IF kind IN ('start','check_in') THEN
 due:=(p_payload->>'expectedAt')::timestamptz;
 IF due IS NULL OR due<=clock_timestamp() OR due>clock_timestamp()+interval '24 hours' THEN RAISE EXCEPTION 'Choose a future check-in within 24 hours'; END IF;
END IF;
IF kind='start' THEN
IF length(trim(coalesce(p_payload->>'destination',''))) NOT BETWEEN 1 AND 160 OR jsonb_typeof(p_payload->'recipientIds') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'recipientIds') NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Choose destination and one to five guardians'; END IF;
IF (SELECT count(*) FROM public.private_journeys WHERE traveller_id=actor AND created_at>now()-interval '1 day')>=20 THEN RAISE EXCEPTION 'Maximum 20 journey starts per day'; END IF;
IF EXISTS(SELECT 1 FROM public.private_journeys WHERE traveller_id=actor AND status='active') THEN RAISE EXCEPTION 'Finish your active journey first'; END IF;
SELECT array_agg(DISTINCT value::uuid ORDER BY value::uuid) INTO ids FROM jsonb_array_elements_text(p_payload->'recipientIds');
FOR g IN SELECT * FROM public.inapp_guardians WHERE id=ANY(ids) ORDER BY id FOR UPDATE LOOP
IF g.traveller_id<>actor OR g.recipient_id IS NULL OR g.consent<>'opted_in' OR g.revoked_at IS NOT NULL OR NOT g.journey_opt_in THEN RAISE EXCEPTION 'Choose only your consenting journey guardians'; END IF;
found_count:=found_count+1; END LOOP;
IF found_count<>cardinality(ids) THEN RAISE EXCEPTION 'Choose only your consenting journey guardians'; END IF;
INSERT INTO public.private_journeys(traveller_id,destination,expected_at,note,location) VALUES(actor,trim(p_payload->>'destination'),due,coalesce(p_payload->>'note',''),loc) RETURNING * INTO j;
INSERT INTO public.journey_shares(journey_id,enrollment_id) SELECT j.id,unnest(ids);
ELSE
SELECT * INTO j FROM public.private_journeys WHERE id=(p_payload->>'journeyId')::uuid AND traveller_id=actor FOR UPDATE;
IF j.id IS NULL THEN RAISE EXCEPTION 'Journey unavailable'; END IF;
IF j.status<>'active' AND kind<>'stop_sharing' THEN RAISE EXCEPTION 'Journey already ended'; END IF;
IF kind='check_in' THEN
UPDATE public.private_journeys SET expected_at=due,last_check_in_at=now(),note=coalesce(p_payload->>'note',''),location=loc,updated_at=now() WHERE id=j.id RETURNING * INTO j;
ELSIF kind='stop_sharing' THEN
UPDATE public.private_journeys SET sharing=false,updated_at=CASE WHEN sharing THEN now() ELSE updated_at END WHERE id=j.id RETURNING * INTO j;
ELSE
UPDATE public.private_journeys SET status=kind,sharing=false,note=coalesce(p_payload->>'note',''),location=loc,updated_at=now() WHERE id=j.id RETURNING * INTO j;
END IF;
END IF;
INSERT INTO public.journey_events(journey_id,traveller_id,action,note,location,expected_at) VALUES(j.id,actor,kind,coalesce(p_payload->>'note',''),loc,due);
result_value:=jsonb_build_object('id',j.id,'duplicate',false);
INSERT INTO public.journey_requests(traveller_id,request_key,payload,result) VALUES(actor,p_request,p_payload,result_value);
RETURN result_value; END $$;
REVOKE ALL ON FUNCTION public.write_private_journey(uuid,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.write_private_journey(uuid,jsonb) TO authenticated;
CREATE FUNCTION public.read_private_journeys(p_guardian boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); stamp timestamptz:=clock_timestamp(); result_value jsonb; BEGIN
IF actor IS NULL THEN RAISE EXCEPTION 'Sign-in required'; END IF;
SELECT coalesce(jsonb_agg(to_jsonb(chosen) ORDER BY chosen.created_at DESC),'[]'::jsonb) INTO result_value FROM (
SELECT j.*,j.status='active' AND j.expected_at<stamp AS overdue,coalesce(p.display_name,'Traveller') AS traveller_name FROM public.private_journeys j LEFT JOIN public.profiles p ON p.id=j.traveller_id WHERE (p_guardian IS FALSE AND j.traveller_id=actor) OR (p_guardian IS TRUE AND public.can_read_journey(j.id)) ORDER BY j.created_at DESC LIMIT 50) chosen;
RETURN jsonb_build_object('serverNow',stamp,'journeys',result_value); END $$;
REVOKE ALL ON FUNCTION public.read_private_journeys(boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.read_private_journeys(boolean) TO authenticated;
COMMENT ON TABLE public.private_journeys IS 'Private authenticated manual check-ins. Active shared status only for selected journey-consenting in-app guardians. Overdue uses server time, not proof of danger. No continuous tracking, background delivery, provider sends or dispatch.';
