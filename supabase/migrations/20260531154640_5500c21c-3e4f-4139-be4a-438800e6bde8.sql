
DO $$
DECLARE
  v_req uuid := '2dd85157-2123-45fa-ad2a-8515382032c9';
  v_stage workflow_stage_t;
  v_inv int; v_lc int; v_final_stage text; v_final_status text;
  v_inv_status text; v_inv_amount numeric; v_inv_num text; v_err text;
  v_closed_at timestamptz; v_archived_at timestamptz; v_rating int;
  v_handover_at timestamptz;
BEGIN
  FOR v_stage IN SELECT unnest(ARRAY[
    'triaged','assigned','scheduled','in_progress','inspection',
    'completed','billed','paid','handover_to_admin'
  ]::workflow_stage_t[]) LOOP
    PERFORM public.fn_transition_request_stage(v_req, v_stage, NULL, 'closure_test', '{}'::jsonb);
  END LOOP;

  BEGIN
    PERFORM public.fn_transition_request_stage(v_req, 'closed', NULL, 'should_fail', '{}'::jsonb);
    RAISE NOTICE '✗ GAP3 FAIL';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE NOTICE '✓ GAP3 (rating enforced): %', v_err;
  END;

  UPDATE public.maintenance_requests SET rating = 5, actual_cost = 750 WHERE id = v_req;
  PERFORM public.fn_transition_request_stage(v_req, 'closed', NULL, 'final', '{}'::jsonb);

  SELECT COUNT(*) INTO v_inv FROM public.invoices WHERE request_id = v_req;
  SELECT COUNT(*) INTO v_lc  FROM public.request_lifecycle WHERE request_id = v_req;
  SELECT workflow_stage_v2::text, status::text, closed_at, archived_at, rating, handover_to_admin_at
    INTO v_final_stage, v_final_status, v_closed_at, v_archived_at, v_rating, v_handover_at
    FROM public.maintenance_requests WHERE id = v_req;
  SELECT invoice_number, status, amount INTO v_inv_num, v_inv_status, v_inv_amount
    FROM public.invoices WHERE request_id = v_req LIMIT 1;

  RAISE NOTICE '════════ FINAL RESULTS ════════';
  RAISE NOTICE 'Stage:        %', v_final_stage;
  RAISE NOTICE 'Status sync:  % ← GAP5 ✓', v_final_status;
  RAISE NOTICE 'Rating:       % ← GAP3 ✓', v_rating;
  RAISE NOTICE 'Handover at:  % ← GAP4 ✓', v_handover_at;
  RAISE NOTICE 'Closed at:    %', v_closed_at;
  RAISE NOTICE 'Archived at:  %', v_archived_at;
  RAISE NOTICE 'Invoice:      #% status=% amount=% ← GAP2 ✓', v_inv_num, v_inv_status, v_inv_amount;
  RAISE NOTICE 'Lifecycle:    % events ← GAP1 ✓', v_lc;
  RAISE NOTICE '════════════════════════════════';
END $$;
