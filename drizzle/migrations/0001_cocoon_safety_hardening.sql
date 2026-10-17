REVOKE ALL ON FUNCTION public.cocoon_profile_signup() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.patch_notify(p_id text,p_patch jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE m public.notify_outbox; sid text; BEGIN
SELECT * INTO m FROM public.notify_outbox WHERE id=p_id FOR UPDATE; IF m.id IS NULL THEN RAISE EXCEPTION 'Message missing'; END IF;
IF m.status IN ('delivered','read','sent') AND p_patch->>'status'='accepted' THEN p_patch=p_patch-'status'; END IF;
p_patch=p_patch||jsonb_build_object('statusTimes',COALESCE(p_patch->'statusTimes','{}')||COALESCE(m.payload->'statusTimes','{}'));
UPDATE public.notify_outbox SET payload=m.payload||p_patch,status=COALESCE(p_patch->>'status',m.status),provider_sid=COALESCE(p_patch->>'providerSid',m.provider_sid),next_attempt_at=COALESCE((p_patch->>'nextAttemptAt')::timestamptz,m.next_attempt_at) WHERE id=p_id RETURNING provider_sid INTO sid;
IF sid IS NOT NULL THEN PERFORM public.reconcile_notify(sid); END IF; END $$;
REVOKE ALL ON FUNCTION public.patch_notify(text,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.patch_notify(text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_notify(p_id text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
UPDATE public.notify_outbox m SET status='sending',claim_at=now(),payload=m.payload||jsonb_build_object('status','sending') WHERE m.id=p_id AND m.status='queued' AND m.next_attempt_at<=now(); RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.claim_notify(text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.claim_notify(text) TO service_role;
CREATE FUNCTION public.fail_ambiguous_notify() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
UPDATE public.notify_outbox SET status='failed',payload=payload||jsonb_build_object('status','failed','lastError','Provider acceptance unknown after worker interruption; operator reconciliation required. Do not resend blindly.') WHERE status='sending' AND claim_at<now()-interval '2 minutes'; END $$;
REVOKE ALL ON FUNCTION public.fail_ambiguous_notify() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.fail_ambiguous_notify() TO service_role;
