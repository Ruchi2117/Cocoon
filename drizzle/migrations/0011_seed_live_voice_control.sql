INSERT INTO public.production_service_state(service,paused,reason) VALUES('live-voice',false,'Initial control row; owner may pause') ON CONFLICT (service) DO NOTHING;
