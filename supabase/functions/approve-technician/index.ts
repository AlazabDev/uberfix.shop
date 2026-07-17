import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalRequest {
  profileId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  reviewerNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user is admin/manager
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check user role via canonical user_roles table
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const allowedRoles = ['admin', 'manager', 'owner'];
    const hasAccess = !rolesError && !!roles?.some((r: any) => allowedRoles.includes(r.role));
    if (!hasAccess) {
      throw new Error('Insufficient permissions');
    }

    const { profileId, action, rejectionReason, reviewerNotes }: ApprovalRequest = await req.json();

    console.log(`Processing ${action} for profile ${profileId}`);

    // Get technician profile
    const { data: techProfile, error: fetchError } = await supabaseClient
      .from('technician_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (fetchError || !techProfile) {
      throw new Error('Technician profile not found');
    }

    if (techProfile.status !== 'pending_review') {
      throw new Error('Profile is not pending review');
    }

    if (action === 'reject') {
      // Update profile status to rejected
      const { error: updateError } = await supabaseClient
        .from('technician_profiles')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: rejectionReason,
          reviewer_notes: reviewerNotes,
        })
        .eq('id', profileId);

      if (updateError) throw updateError;

      // Send rejection notification
      await supabaseClient.functions.invoke('send-unified-notification', {
        body: {
          type: 'technician_rejected',
          recipient_id: techProfile.user_id,
          recipient_phone: techProfile.phone,
          recipient_email: techProfile.email,
          channels: ['email', 'sms', 'in_app'],
          data: {
            technician_name: techProfile.full_name,
            rejection_reason: rejectionReason || 'لم يتم تحديد سبب',
          },
        },
      });

      console.log(`Technician profile ${profileId} rejected`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Technician profile rejected',
          action: 'rejected',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // APPROVE: Call the database function to transfer data
    const { data: newTechnicianId, error: approveError } = await supabaseClient
      .rpc('approve_technician_profile', { profile_id: profileId });

    if (approveError) {
      console.error('Approval error:', approveError);
      throw new Error(`Failed to approve technician: ${approveError.message}`);
    }

    // Update reviewer information
    const { error: updateReviewerError } = await supabaseClient
      .from('technician_profiles')
      .update({
        reviewed_by: user.id,
        reviewer_notes: reviewerNotes,
      })
      .eq('id', profileId);

    if (updateReviewerError) {
      console.error('Failed to update reviewer info:', updateReviewerError);
    }

    // Send approval notification
    await supabaseClient.functions.invoke('send-unified-notification', {
      body: {
        type: 'technician_approved',
        recipient_id: techProfile.user_id,
        recipient_phone: techProfile.phone,
        recipient_email: techProfile.email,
        channels: ['email', 'sms', 'whatsapp', 'in_app'],
        data: {
          technician_name: techProfile.full_name,
          technician_id: newTechnicianId,
          login_url: 'https://uberfix.shop/technician/dashboard',
        },
      },
    });

    console.log(`Technician approved successfully. New technician ID: ${newTechnicianId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Technician approved successfully',
        action: 'approved',
        technicianId: newTechnicianId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in approve-technician:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
