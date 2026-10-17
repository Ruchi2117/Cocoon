CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT 'Traveller' CHECK(length(display_name)<=60), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_profile_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE POLICY own_profile_edit ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE FUNCTION public.cocoon_profile_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.profiles(id) VALUES(NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER cocoon_profile_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.cocoon_profile_signup();
CREATE TABLE public.guardian_enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), traveller_id uuid NOT NULL, recipient_id uuid, name text NOT NULL CHECK(length(name)<=60), invited_email text NOT NULL, phone text, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, consent text NOT NULL DEFAULT 'invited' CHECK(consent IN ('invited','opted_in','opted_out')), consent_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.guardian_enrollments TO authenticated; GRANT ALL ON public.guardian_enrollments TO service_role;
ALTER TABLE public.guardian_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollment_read ON public.guardian_enrollments FOR SELECT TO authenticated USING(traveller_id=auth.uid() OR recipient_id=auth.uid());
REVOKE SELECT ON public.guardian_enrollments FROM authenticated;
GRANT SELECT(id,traveller_id,recipient_id,name,phone,consent,consent_at,revoked_at,expires_at,created_at) ON public.guardian_enrollments TO authenticated;
CREATE TABLE public.alert_preferences (traveller_id uuid PRIMARY KEY, enabled jsonb NOT NULL DEFAULT '{"trip_started":false,"checkin_overdue":false,"concern":false,"sos":false,"arrived":false}', grace_minutes integer NOT NULL DEFAULT 5 CHECK(grace_minutes BETWEEN 1 AND 60), channel text NOT NULL DEFAULT 'whatsapp' CHECK(channel='whatsapp'), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON public.alert_preferences TO authenticated; GRANT ALL ON public.alert_preferences TO service_role;
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY preferences_owner ON public.alert_preferences FOR ALL TO authenticated USING(traveller_id=auth.uid()) WITH CHECK(traveller_id=auth.uid());
CREATE TABLE public.emergency_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), traveller_id uuid NOT NULL, request_key uuid NOT NULL, payload jsonb NOT NULL, note text NOT NULL DEFAULT '' CHECK(length(note)<=500), location jsonb, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(traveller_id,request_key));
GRANT SELECT ON public.emergency_sessions TO authenticated; GRANT ALL ON public.emergency_sessions TO service_role;
ALTER TABLE public.emergency_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_owner ON public.emergency_sessions FOR SELECT TO authenticated USING(traveller_id=auth.uid());
CREATE TABLE public.notify_outbox (id text PRIMARY KEY, idempotency_key text NOT NULL UNIQUE, trip_id uuid NOT NULL REFERENCES public.emergency_sessions(id), traveller_id uuid NOT NULL, recipient_id uuid NOT NULL REFERENCES public.guardian_enrollments(id), status text NOT NULL DEFAULT 'queued', next_attempt_at timestamptz NOT NULL DEFAULT now(), provider_sid text UNIQUE, payload jsonb NOT NULL, claim_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.notify_outbox TO authenticated; GRANT ALL ON public.notify_outbox TO service_role;
ALTER TABLE public.notify_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY outbox_owner ON public.notify_outbox FOR SELECT TO authenticated USING(traveller_id=auth.uid());
CREATE POLICY outbox_recipient ON public.notify_outbox FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.guardian_enrollments g WHERE g.id=recipient_id AND g.recipient_id=auth.uid() AND g.consent='opted_in' AND g.revoked_at IS NULL));
CREATE INDEX notify_due ON public.notify_outbox(next_attempt_at) WHERE status='queued';
CREATE TABLE public.notify_jobs (id text PRIMARY KEY, job_key text NOT NULL UNIQUE, trip_id uuid NOT NULL REFERENCES public.emergency_sessions(id), status text NOT NULL, run_at timestamptz NOT NULL, payload jsonb NOT NULL);
GRANT SELECT ON public.notify_jobs TO authenticated; GRANT ALL ON public.notify_jobs TO service_role;
ALTER TABLE public.notify_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_owner ON public.notify_jobs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.emergency_sessions s WHERE s.id=trip_id AND s.traveller_id=auth.uid()));
CREATE TABLE public.notify_webhook_events (event_id text PRIMARY KEY, sid text NOT NULL, status text NOT NULL, payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz);
GRANT ALL ON public.notify_webhook_events TO service_role;
ALTER TABLE public.notify_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX notify_unprocessed ON public.notify_webhook_events(sid) WHERE processed_at IS NULL;
CREATE TABLE public.voice_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, provider_call_id text, started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes', status text NOT NULL DEFAULT 'starting' CHECK(status IN ('starting','active','closed','failed')), ended_at timestamptz);
GRANT SELECT ON public.voice_sessions TO authenticated; GRANT ALL ON public.voice_sessions TO service_role;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_owner ON public.voice_sessions FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX voice_user_day ON public.voice_sessions(user_id,started_at);
CREATE TABLE public.production_service_state (service text PRIMARY KEY, paused boolean NOT NULL DEFAULT false, reason text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.production_service_state TO service_role;
ALTER TABLE public.production_service_state ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.confirm_guardian(p_hash text,p_phone text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE g public.guardian_enrollments; verified_email text; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
SELECT lower(email) INTO verified_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
SELECT * INTO g FROM public.guardian_enrollments WHERE token_hash=p_hash FOR UPDATE;
IF g.id IS NULL OR g.expires_at<now() OR g.revoked_at IS NOT NULL OR g.consent<>'invited' OR verified_email IS NULL OR lower(g.invited_email)<>verified_email OR g.traveller_id=auth.uid() THEN RAISE EXCEPTION 'Invitation unavailable for this verified account'; END IF;
IF p_phone !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'International number required'; END IF;
UPDATE public.guardian_enrollments SET recipient_id=auth.uid(),phone=p_phone,consent='opted_in',consent_at=now() WHERE id=g.id;
RETURN g.id; END $$;
REVOKE ALL ON FUNCTION public.confirm_guardian(text,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.confirm_guardian(text,text) TO authenticated;
CREATE FUNCTION public.revoke_guardian(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
UPDATE public.guardian_enrollments SET consent='opted_out',revoked_at=now() WHERE id=p_id AND (traveller_id=auth.uid() OR recipient_id=auth.uid());
IF NOT FOUND THEN RAISE EXCEPTION 'Enrollment unavailable'; END IF;
UPDATE public.notify_outbox SET status='cancelled',payload=payload||jsonb_build_object('status','cancelled','lastError','consent_revoked') WHERE recipient_id=p_id AND status='queued'; END $$;
REVOKE ALL ON FUNCTION public.revoke_guardian(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.revoke_guardian(uuid) TO authenticated;
CREATE FUNCTION public.reserve_voice(p_user uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v uuid; BEGIN
PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,1));
IF EXISTS(SELECT 1 FROM public.voice_sessions WHERE user_id=p_user AND status IN ('starting','active') AND expires_at>now()) THEN RAISE EXCEPTION 'A call is already active'; END IF;
IF (SELECT count(*) FROM public.voice_sessions WHERE user_id=p_user AND started_at>now()-interval '1 hour')>=3 OR (SELECT count(*) FROM public.voice_sessions WHERE user_id=p_user AND started_at>=date_trunc('day',now()))>=10 THEN RAISE EXCEPTION 'Voice usage limit reached'; END IF;
INSERT INTO public.voice_sessions(user_id) VALUES(p_user) RETURNING id INTO v; RETURN v; END $$;
REVOKE ALL ON FUNCTION public.reserve_voice(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.reserve_voice(uuid) TO service_role;
CREATE FUNCTION public.claim_notify(p_id text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
UPDATE public.notify_outbox SET status='sending',claim_at=now(),payload=payload||jsonb_build_object('status','sending') WHERE id=p_id AND status='queued' AND next_attempt_at<=now(); RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.claim_notify(text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.claim_notify(text) TO service_role;
CREATE FUNCTION public.reconcile_notify(p_sid text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE m public.notify_outbox; e public.notify_webhook_events; cur integer; nxt integer; mapped text; times jsonb; BEGIN
SELECT * INTO m FROM public.notify_outbox WHERE provider_sid=p_sid FOR UPDATE; IF m.id IS NULL THEN RETURN; END IF;
FOR e IN SELECT * FROM public.notify_webhook_events WHERE sid=p_sid AND processed_at IS NULL ORDER BY received_at,event_id FOR UPDATE LOOP
mapped=CASE WHEN e.status IN ('queued','sending','accepted') THEN 'accepted' ELSE e.status END;
IF mapped IN ('accepted','sent','delivered','read','failed','undelivered') THEN
cur=CASE m.status WHEN 'accepted' THEN 1 WHEN 'sent' THEN 2 WHEN 'delivered' THEN 3 WHEN 'read' THEN 4 ELSE 0 END;
nxt=CASE mapped WHEN 'accepted' THEN 1 WHEN 'sent' THEN 2 WHEN 'delivered' THEN 3 WHEN 'read' THEN 4 ELSE 0 END;
times=COALESCE(m.payload->'statusTimes','{}'::jsonb); IF NOT times ? mapped THEN times=times||jsonb_build_object(mapped,e.received_at); END IF;
IF nxt>cur OR (mapped IN ('failed','undelivered') AND cur<3) THEN m.status=mapped; END IF;
m.payload=m.payload||jsonb_build_object('status',m.status,'statusTimes',times);
IF mapped IN ('failed','undelivered') THEN m.payload=m.payload||jsonb_build_object('lastError',COALESCE(e.payload->>'ErrorCode','provider_delivery_failed')); END IF;
UPDATE public.notify_outbox SET status=m.status,payload=m.payload WHERE id=m.id;
END IF; UPDATE public.notify_webhook_events SET processed_at=now() WHERE event_id=e.event_id;
END LOOP; END $$;
REVOKE ALL ON FUNCTION public.reconcile_notify(text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.reconcile_notify(text) TO service_role;
CREATE FUNCTION public.patch_notify(p_id text,p_patch jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE m public.notify_outbox; sid text; BEGIN
SELECT * INTO m FROM public.notify_outbox WHERE id=p_id FOR UPDATE; IF m.id IS NULL THEN RAISE EXCEPTION 'Message missing'; END IF;
IF m.status IN ('delivered','read','sent') AND p_patch->>'status'='accepted' THEN p_patch=p_patch-'status'; END IF;
p_patch=p_patch||jsonb_build_object('statusTimes',COALESCE(m.payload->'statusTimes','{}')||COALESCE(p_patch->'statusTimes','{}'));
UPDATE public.notify_outbox SET payload=m.payload||p_patch,status=COALESCE(p_patch->>'status',m.status),provider_sid=COALESCE(p_patch->>'providerSid',m.provider_sid),next_attempt_at=COALESCE((p_patch->>'nextAttemptAt')::timestamptz,m.next_attempt_at) WHERE id=p_id RETURNING provider_sid INTO sid;
IF sid IS NOT NULL THEN PERFORM public.reconcile_notify(sid); END IF; END $$;
REVOKE ALL ON FUNCTION public.patch_notify(text,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.patch_notify(text,jsonb) TO service_role;
CREATE FUNCTION public.store_notify_callback(p_key text,p_sid text,p_status text,p_payload jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.notify_webhook_events(event_id,sid,status,payload) VALUES(p_key,p_sid,p_status,p_payload) ON CONFLICT DO NOTHING; PERFORM public.reconcile_notify(p_sid); END $$;
REVOKE ALL ON FUNCTION public.store_notify_callback(text,text,text,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.store_notify_callback(text,text,text,jsonb) TO service_role;
CREATE FUNCTION public.ack_notify(p_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
UPDATE public.notify_outbox m SET payload=m.payload||jsonb_build_object('acknowledgedAt',COALESCE(m.payload->>'acknowledgedAt',now()::text)) WHERE m.id=p_id AND EXISTS(SELECT 1 FROM public.guardian_enrollments g WHERE g.id=m.recipient_id AND g.recipient_id=auth.uid() AND g.consent='opted_in' AND g.revoked_at IS NULL); IF NOT FOUND THEN RAISE EXCEPTION 'Message unavailable'; END IF; END $$;
REVOKE ALL ON FUNCTION public.ack_notify(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.ack_notify(text) TO authenticated;
