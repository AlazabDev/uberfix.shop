import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  id: string;
  type: string;
  payload: any;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  scheduled_at?: string;
  created_at: string;
}

const JOB_HANDLERS = {
  'send_notification': async (payload: any, supabase: any) => {
    console.log('Sending notification:', payload);
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: payload.recipient_id,
        title: payload.title,
        message: payload.message,
        type: payload.type,
      });
    if (error) throw error;
    return data;
  },

  'generate_report': async (payload: any, supabase: any) => {
    console.log('Generating report:', payload);
    // Implement report generation logic
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
    return { report_url: `/reports/${payload.report_id}` };
  },

  'cleanup_old_data': async (payload: any, supabase: any) => {
    console.log('Cleaning up old data:', payload);
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
    if (error) throw error;
    return { deleted: true };
  },

  'update_statistics': async (payload: any, supabase: any) => {
    console.log('Updating statistics:', payload);
    // Implement statistics update logic
    return { updated: true };
  },

  'send_email_batch': async (payload: any, supabase: any) => {
    console.log('Sending email batch:', payload);
    // Implement batch email sending
    return { sent: payload.emails?.length || 0 };
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // AuthZ: staff/admin only
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const isServiceRole = token === supabaseKey;
  if (!isServiceRole) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);
    const allowed = !!roles?.some((r: any) =>
      ['admin', 'owner', 'manager'].includes(r.role)
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Add new job
    if (action === 'enqueue' && req.method === 'POST') {
      const { type, payload, priority = 5, scheduled_at } = await req.json();

      const job = {
        type,
        payload,
        priority,
        status: 'pending' as const,
        attempts: 0,
        max_attempts: 3,
        scheduled_at,
      };

      const { data, error } = await supabase
        .from('background_jobs')
        .insert(job)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, job: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process jobs (called by cron or manually)
    if (action === 'process') {
      const batchSize = parseInt(url.searchParams.get('batch') || '10');
      
      // Get pending jobs
      const { data: jobs, error: fetchError } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'pending')
        .filter('attempts', 'lt', 'max_attempts')
        .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (fetchError) throw fetchError;

      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      };

      for (const job of jobs || []) {
        try {
          // Mark as processing
          await supabase
            .from('background_jobs')
            .update({ status: 'processing' })
            .eq('id', job.id);

          // Execute job handler
          const handler = JOB_HANDLERS[job.type as keyof typeof JOB_HANDLERS];
          if (!handler) {
            console.error(`No handler found for job type: ${job.type}`);
            results.skipped++;
            continue;
          }

          const result = await handler(job.payload, supabase);

          // Mark as completed
          await supabase
            .from('background_jobs')
            .update({
              status: 'completed',
              result,
              completed_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          results.processed++;
          results.succeeded++;
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          
          // Increment attempts
          const newAttempts = job.attempts + 1;
          const newStatus = newAttempts >= job.max_attempts ? 'failed' : 'pending';

          await supabase
            .from('background_jobs')
            .update({
              status: newStatus,
              attempts: newAttempts,
              error: error instanceof Error ? error.message : String(error),
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          results.processed++;
          results.failed++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get job status
    if (action === 'status' && req.method === 'GET') {
      const jobId = url.searchParams.get('id');
      
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, job: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get queue statistics
    if (action === 'stats') {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pending: data?.filter(j => j.status === 'pending').length || 0,
        processing: data?.filter(j => j.status === 'processing').length || 0,
        completed: data?.filter(j => j.status === 'completed').length || 0,
        failed: data?.filter(j => j.status === 'failed').length || 0,
      };

      return new Response(
        JSON.stringify({ success: true, stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Background jobs error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
