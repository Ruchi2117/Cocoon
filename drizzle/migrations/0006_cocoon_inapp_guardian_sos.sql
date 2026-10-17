CREATE TABLE public.inapp_guardians (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), traveller_id uuid NOT NULL, recipient_id uuid,
 name text NOT NULL, invited_email text NOT NULL, token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '7 days'),
 consent text NOT NULL DEFAULT 'invited' CHECK(consent IN ('invited','opted_in','opted_out')),
 consent_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT(id,traveller_id,recipient_id,name,expires_at,consent,consent_at,revoked_at,created_at) ON public.inapp_guardians TO authenticated;
GRANT ALL ON public.inapp_guardians TO service_role;
ALTER TABLE public.inapp_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY inapp_connection_read ON public.inapp_guardians FOR SELECT TO authenticated USING(traveller_id=auth.uid() OR recipient_id=auth.uid());
CREATE TABLE public.inapp_sos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), traveller_id uuid NOT NULL, request_key uuid NOT NULL,
 request_payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(traveller_id,request_key)
);
GRANT SELECT ON public.inapp_sos TO authenticated;
GRANT ALL ON public.inapp_sos TO service_role;
ALTER TABLE public.inapp_sos ENABLE ROW LEVEL SECURITY;
CREATE POLICY inapp_sos_owner ON public.inapp_sos FOR SELECT TO authenticated USING(traveller_id=auth.uid());
CREATE TABLE public.inapp_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sos_id uuid NOT NULL REFERENCES public.inapp_sos(id),
 traveller_id uuid NOT NULL, enrollment_id uuid NOT NULL REFERENCES public.inapp_guardians(id), recipient_id uuid NOT NULL,
 traveller_name text NOT NULL, note text NOT NULL DEFAULT '', location jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz, read_at timestamptz, acknowledged_at timestamptz, UNIQUE(sos_id,enrollment_id)
);
GRANT SELECT ON public.inapp_alerts TO authenticated;
GRANT ALL ON public.inapp_alerts TO service_role;
ALTER TABLE public.inapp_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY inapp_alert_owner ON public.inapp_alerts FOR SELECT TO authenticated USING(traveller_id=auth.uid());
CREATE POLICY inapp_alert_recipient ON public.inapp_alerts FOR SELECT TO authenticated USING(recipient_id=auth.uid() AND EXISTS(SELECT 1 FROM public.inapp_guardians g WHERE g.id=inapp_alerts.enrollment_id AND g.recipient_id=auth.uid() AND g.consent='opted_in' AND g.revoked_at IS NULL));
CREATE INDEX inapp_alert_inbox ON public.inapp_alerts(recipient_id,created_at DESC);
CREATE FUNCTION public.invite_inapp_guardian(p_name text,p_email text,p_hash text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); result uuid; BEGIN
IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified sign-in required'; END IF;
IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 60 OR p_email IS NULL OR length(p_email)>254 OR p_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('inapp-invite:'||actor::text,0));
IF (SELECT count(*) FROM public.inapp_guardians WHERE traveller_id=actor AND revoked_at IS NULL AND (consent='opted_in' OR expires_at>now()))>=10 THEN RAISE EXCEPTION 'Maximum ten active in-app invitations'; END IF;
INSERT INTO public.inapp_guardians(traveller_id,name,invited_email,token_hash) VALUES(actor,trim(p_name),lower(trim(p_email)),p_hash) RETURNING id INTO result; RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.invite_inapp_guardian(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.invite_inapp_guardian(text,text,text) TO authenticated;
CREATE FUNCTION public.confirm_inapp_guardian(p_hash text,p_consent boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); email_value text; g public.inapp_guardians; BEGIN
SELECT lower(email) INTO email_value FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL;
IF actor IS NULL OR email_value IS NULL OR p_consent IS DISTINCT FROM true THEN RAISE EXCEPTION 'Invitation unavailable for this verified account'; END IF;
SELECT * INTO g FROM public.inapp_guardians WHERE token_hash=p_hash FOR UPDATE;
IF g.id IS NULL OR g.traveller_id=actor OR g.invited_email<>email_value OR g.expires_at<=now() OR g.consent<>'invited' OR g.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation unavailable for this verified account'; END IF;
UPDATE public.inapp_guardians SET recipient_id=actor,consent='opted_in',consent_at=now() WHERE id=g.id; RETURN g.id;
END $$;
REVOKE ALL ON FUNCTION public.confirm_inapp_guardian(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_inapp_guardian(text,boolean) TO authenticated;
CREATE FUNCTION public.revoke_inapp_guardian(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.inapp_guardians; BEGIN
SELECT * INTO g FROM public.inapp_guardians WHERE id=p_id FOR UPDATE;
IF auth.uid() IS NULL OR g.id IS NULL OR (auth.uid()<>g.traveller_id AND auth.uid() IS DISTINCT FROM g.recipient_id) THEN RAISE EXCEPTION 'Connection unavailable'; END IF;
UPDATE public.inapp_guardians SET consent='opted_out',revoked_at=coalesce(revoked_at,now()) WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.revoke_inapp_guardian(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revoke_inapp_guardian(uuid) TO authenticated;
CREATE FUNCTION public.send_inapp_sos(p_request uuid,p_recipients uuid[],p_note text,p_location jsonb,p_location_consent boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); ids uuid[]; g public.inapp_guardians; found_count integer:=0; session_id uuid; payload_value jsonb; previous jsonb; display_value text; stamp numeric; BEGIN
IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified sign-in required'; END IF;
IF p_request IS NULL OR p_note IS NULL OR length(p_note)>500 OR cardinality(p_recipients) IS NULL OR cardinality(p_recipients) NOT BETWEEN 1 AND 5 OR array_position(p_recipients,NULL) IS NOT NULL THEN RAISE EXCEPTION 'Invalid SOS request'; END IF;
SELECT array_agg(DISTINCT x ORDER BY x) INTO ids FROM unnest(p_recipients) x;
IF p_location IS NOT NULL AND p_location<>'null'::jsonb THEN
IF p_location_consent IS DISTINCT FROM true OR jsonb_typeof(p_location)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p_location))<>4 OR NOT(p_location ?& ARRAY['latitude','longitude','accuracy','timestamp']) OR jsonb_typeof(p_location->'latitude')<>'number' OR jsonb_typeof(p_location->'longitude')<>'number' OR jsonb_typeof(p_location->'accuracy')<>'number' OR jsonb_typeof(p_location->'timestamp')<>'number' THEN RAISE EXCEPTION 'Location requires consent and a fresh one-time fix'; END IF;
stamp:=(p_location->>'timestamp')::numeric;
IF (p_location->>'latitude')::numeric NOT BETWEEN -90 AND 90 OR (p_location->>'longitude')::numeric NOT BETWEEN -180 AND 180 OR (p_location->>'accuracy')::numeric NOT BETWEEN 0 AND 100000 OR stamp<>trunc(stamp) OR stamp>extract(epoch FROM clock_timestamp())*1000+10000 OR stamp<extract(epoch FROM clock_timestamp())*1000-120000 THEN RAISE EXCEPTION 'Location requires consent and a fresh one-time fix'; END IF;
ELSE p_location:=NULL; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('inapp-sos:'||actor::text||':'||p_request::text,0));
FOR g IN SELECT * FROM public.inapp_guardians WHERE id=ANY(ids) ORDER BY id FOR UPDATE LOOP
IF g.traveller_id<>actor OR g.recipient_id IS NULL OR g.consent<>'opted_in' OR g.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Select only your opted-in in-app guardians'; END IF;
found_count:=found_count+1;
END LOOP;
IF found_count<>cardinality(ids) THEN RAISE EXCEPTION 'Select only your opted-in in-app guardians'; END IF;
payload_value:=jsonb_build_object('recipientIds',to_jsonb(ids),'note',p_note,'location',p_location);
SELECT id,request_payload INTO session_id,previous FROM public.inapp_sos WHERE traveller_id=actor AND request_key=p_request;
IF session_id IS NOT NULL THEN
IF previous<>payload_value THEN RAISE EXCEPTION 'Request key already used; start a new SOS for changes'; END IF;
RETURN jsonb_build_object('id',session_id,'count',cardinality(ids),'duplicate',true);
END IF;
SELECT display_name INTO display_value FROM public.profiles WHERE id=actor;
INSERT INTO public.inapp_sos(traveller_id,request_key,request_payload) VALUES(actor,p_request,payload_value) RETURNING id INTO session_id;
INSERT INTO public.inapp_alerts(sos_id,traveller_id,enrollment_id,recipient_id,traveller_name,note,location)
SELECT session_id,actor,id,recipient_id,coalesce(display_value,'Traveller'),p_note,p_location FROM public.inapp_guardians WHERE id=ANY(ids);
RETURN jsonb_build_object('id',session_id,'count',cardinality(ids),'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.send_inapp_sos(uuid,uuid[],text,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_inapp_sos(uuid,uuid[],text,jsonb,boolean) TO authenticated;
CREATE FUNCTION public.retrieve_inapp_inbox() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); ids uuid[]; result jsonb; BEGIN
IF actor IS NULL THEN RAISE EXCEPTION 'Sign-in required'; END IF;
PERFORM id FROM public.inapp_guardians WHERE recipient_id=actor ORDER BY id FOR UPDATE;
SELECT array_agg(id) INTO ids FROM (SELECT a.id FROM public.inapp_alerts a JOIN public.inapp_guardians g ON g.id=a.enrollment_id WHERE a.recipient_id=actor AND g.recipient_id=actor AND g.consent='opted_in' AND g.revoked_at IS NULL ORDER BY a.created_at DESC,a.id LIMIT 50) chosen;
UPDATE public.inapp_alerts SET delivered_at=coalesce(delivered_at,now()) WHERE id=ANY(ids);
SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC,a.id),'[]'::jsonb) INTO result FROM public.inapp_alerts a WHERE a.id=ANY(ids);
RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.retrieve_inapp_inbox() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.retrieve_inapp_inbox() TO authenticated;
CREATE FUNCTION public.open_inapp_alert(p_id uuid,p_ack boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid(); g public.inapp_guardians; a public.inapp_alerts; BEGIN
SELECT enrollment_id INTO a.enrollment_id FROM public.inapp_alerts WHERE id=p_id AND recipient_id=actor;
SELECT * INTO g FROM public.inapp_guardians WHERE id=a.enrollment_id FOR UPDATE;
IF actor IS NULL OR g.id IS NULL OR g.recipient_id IS DISTINCT FROM actor OR g.consent<>'opted_in' OR g.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Alert unavailable'; END IF;
SELECT * INTO a FROM public.inapp_alerts WHERE id=p_id AND recipient_id=actor FOR UPDATE;
IF p_ack IS TRUE AND a.read_at IS NULL THEN RAISE EXCEPTION 'Open the alert before acknowledging'; END IF;
UPDATE public.inapp_alerts SET delivered_at=coalesce(delivered_at,now()),read_at=coalesce(read_at,now()),acknowledged_at=CASE WHEN p_ack IS TRUE THEN coalesce(acknowledged_at,now()) ELSE acknowledged_at END WHERE id=p_id RETURNING * INTO a;
RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.open_inapp_alert(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_inapp_alert(uuid,boolean) TO authenticated;
COMMENT ON TABLE public.inapp_alerts IS 'Provider-free private SOS inbox. Delivered means authenticated inbox retrieval; read means explicit authenticated opening; acknowledgement is separate. No background/push or external dispatch.';
