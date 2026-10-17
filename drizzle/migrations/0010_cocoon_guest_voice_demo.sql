CREATE TABLE public.guest_voice_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_hash text NOT NULL CHECK (length(client_hash) = 64), started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now() + interval '4 minutes', status text NOT NULL DEFAULT 'starting' CHECK (status IN ('starting','active','closed','failed')), ended_at timestamptz);
GRANT ALL ON public.guest_voice_sessions TO service_role;
ALTER TABLE public.guest_voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX guest_voice_client_time ON public.guest_voice_sessions(client_hash, started_at);
CREATE INDEX guest_voice_time ON public.guest_voice_sessions(started_at);
CREATE FUNCTION public.reserve_guest_voice(p_client text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v uuid; BEGIN
IF p_client IS NULL OR length(p_client) <> 64 THEN RAISE EXCEPTION 'Invalid client'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('guest-voice',7));
IF EXISTS(SELECT 1 FROM public.guest_voice_sessions WHERE client_hash=p_client AND status IN ('starting','active') AND expires_at>now()) THEN RAISE EXCEPTION 'A demo call is already active'; END IF;
IF (SELECT count(*) FROM public.guest_voice_sessions WHERE client_hash=p_client AND started_at>now()-interval '1 hour')>=2
 OR (SELECT count(*) FROM public.guest_voice_sessions WHERE client_hash=p_client AND started_at>=date_trunc('day',now()))>=4
 OR (SELECT count(*) FROM public.guest_voice_sessions WHERE started_at>=date_trunc('day',now()))>=60
 OR (SELECT count(*) FROM public.guest_voice_sessions WHERE status IN ('starting','active') AND expires_at>now())>=5
THEN RAISE EXCEPTION 'Demo call limit reached'; END IF;
INSERT INTO public.guest_voice_sessions(client_hash) VALUES(p_client) RETURNING id INTO v; RETURN v; END $$;
REVOKE ALL ON FUNCTION public.reserve_guest_voice(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_guest_voice(text) TO service_role;
