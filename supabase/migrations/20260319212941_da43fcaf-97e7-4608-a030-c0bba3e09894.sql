-- Insert API consumer for Brand Identity website
INSERT INTO api_consumers (name, channel, company_id, branch_id, is_active, rate_limit_per_minute, allowed_origins)
VALUES (
  'Brand Identity Website',
  'api',
  'd0d29b3e-a5b4-4326-a213-f1e6a19c77de',
  '95dbdd67-61c4-43b9-ac69-8449d867a426',
  true,
  30,
  ARRAY['*']
);
