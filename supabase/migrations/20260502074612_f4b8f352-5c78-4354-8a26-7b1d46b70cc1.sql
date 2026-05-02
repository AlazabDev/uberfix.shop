-- Add 5 bot consumers with auto-generated API keys
DO $$
DECLARE
  bot_record RECORD;
  v_api_key TEXT;
  v_prefix TEXT;
  v_hash TEXT;
BEGIN
  FOR bot_record IN
    SELECT * FROM (VALUES
      ('azabot', 'AzaBot - بوت العزب الرئيسي متعدد القنوات'),
      ('uberfix_bot', 'UberFix Bot - بوت موقع الصيانة'),
      ('laban_alasfour_bot', 'Laban Alasfour Bot - بوت لبن العصفور'),
      ('brands_identity_bot', 'Brands Identity Bot - بوت هوية العلامات التجارية'),
      ('luxury_finishing_bot', 'Luxury Finishing Bot - بوت التشطيبات الفاخرة')
    ) AS t(bot_name, bot_desc)
  LOOP
    -- Skip if already exists
    IF EXISTS (SELECT 1 FROM public.api_consumers WHERE name = bot_record.bot_name) THEN
      CONTINUE;
    END IF;

    v_api_key := 'uf_' || encode(extensions.gen_random_bytes(24), 'hex');
    v_prefix := substring(v_api_key, 1, 11);
    v_hash := encode(extensions.digest(v_api_key, 'sha256'), 'hex');

    INSERT INTO public.api_consumers (
      name, channel, api_key, api_key_hash, api_key_prefix,
      is_active, rate_limit_per_minute, scopes, auth_type, storage_target,
      metadata
    ) VALUES (
      bot_record.bot_name,
      'bot',
      v_api_key,
      v_hash,
      v_prefix,
      true,
      120,
      ARRAY['requests:read','requests:write','catalog:read','technicians:read','properties:read'],
      'api_key',
      'supabase_local',
      jsonb_build_object('description', bot_record.bot_desc, 'created_via', 'bulk_bot_provisioning')
    );
  END LOOP;
END $$;