ALTER POLICY outbox_recipient ON public.notify_outbox USING(EXISTS(SELECT 1 FROM public.guardian_enrollments g WHERE g.id=public.notify_outbox.recipient_id AND g.recipient_id=auth.uid() AND g.consent='opted_in' AND g.revoked_at IS NULL));
CREATE TABLE public.notify_worker_leases (name text PRIMARY KEY, token uuid NOT NULL, until_at timestamptz NOT NULL);
GRANT ALL ON public.notify_worker_leases TO service_role;
ALTER TABLE public.notify_worker_leases ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.acquire_notify_worker(p_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.notify_worker_leases(name,token,until_at) VALUES('dispatch',p_token,now()+interval '2 minutes') ON CONFLICT(name) DO UPDATE SET token=EXCLUDED.token,until_at=EXCLUDED.until_at WHERE public.notify_worker_leases.until_at<now(); RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.acquire_notify_worker(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.acquire_notify_worker(uuid) TO service_role;
CREATE FUNCTION public.release_notify_worker(p_token uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN UPDATE public.notify_worker_leases SET until_at=now() WHERE name='dispatch' AND token=p_token; END $$;
REVOKE ALL ON FUNCTION public.release_notify_worker(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.release_notify_worker(uuid) TO service_role;
