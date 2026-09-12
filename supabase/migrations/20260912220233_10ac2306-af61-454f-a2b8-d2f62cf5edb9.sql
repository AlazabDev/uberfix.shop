INSERT INTO public.workflow_transitions (from_stage, to_stage, required_role, is_active)
VALUES ('paid', 'closed', 'admin', true)
ON CONFLICT DO NOTHING;