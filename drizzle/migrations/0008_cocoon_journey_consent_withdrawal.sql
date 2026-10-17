ALTER TABLE public.journey_shares ADD COLUMN revoked_at timestamptz;
CREATE FUNCTION public.revoke_existing_journey_shares() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF (OLD.journey_opt_in AND NOT NEW.journey_opt_in) OR (OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL) OR (OLD.consent='opted_in' AND NEW.consent<>'opted_in') THEN
UPDATE public.journey_shares SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE enrollment_id=NEW.id AND revoked_at IS NULL;
END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.revoke_existing_journey_shares() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER journey_consent_withdrawal AFTER UPDATE OF journey_opt_in,revoked_at,consent ON public.inapp_guardians FOR EACH ROW EXECUTE FUNCTION public.revoke_existing_journey_shares();
CREATE OR REPLACE FUNCTION public.can_read_journey(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.private_journeys j JOIN public.journey_shares s ON s.journey_id=j.id JOIN public.inapp_guardians g ON g.id=s.enrollment_id WHERE j.id=p_id AND j.sharing AND j.status='active' AND s.revoked_at IS NULL AND g.recipient_id=auth.uid() AND g.traveller_id=j.traveller_id AND g.consent='opted_in' AND g.revoked_at IS NULL AND g.journey_opt_in)
$$;
COMMENT ON COLUMN public.journey_shares.revoked_at IS 'Permanent withdrawal of this journey share. Re-enabling journey consent does not restore old shares; traveller must start a new explicitly reviewed journey.';
