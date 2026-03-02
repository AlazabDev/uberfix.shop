
-- Add read_at and retry columns to message_logs for better tracking
ALTER TABLE public.message_logs 
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_stage text,
  ADD COLUMN IF NOT EXISTS channel text GENERATED ALWAYS AS (message_type) STORED;

-- Create notification_stats materialized view for fast KPI queries
CREATE MATERIALIZED VIEW IF NOT EXISTS public.notification_stats_daily AS
SELECT 
  DATE(created_at) as date,
  message_type,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE read_at IS NOT NULL) as read_count
FROM public.message_logs
GROUP BY DATE(created_at), message_type, status;

-- Create index for fast refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_stats_daily 
  ON public.notification_stats_daily (date, message_type, status);

-- Create function to refresh stats
CREATE OR REPLACE FUNCTION public.refresh_notification_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.notification_stats_daily;
END;
$$;

-- Add indexes for better query performance on message_logs
CREATE INDEX IF NOT EXISTS idx_message_logs_type_status ON public.message_logs (message_type, status);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON public.message_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_request_id ON public.message_logs (request_id);
