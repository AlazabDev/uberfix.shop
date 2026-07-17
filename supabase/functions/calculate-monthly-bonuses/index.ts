import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // AuthZ: admin/owner/finance or service-role
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (token !== serviceKey) {
      const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id);
      const allowed = !!roles?.some((r: any) =>
        ['admin', 'owner', 'finance', 'accounting'].includes(r.role)
      );
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'Forbidden: finance role required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    console.log('🎯 Starting monthly bonus calculation...');

    // Get all active technicians with their performance
    const { data: technicians, error: techError } = await supabaseClient
      .from('technicians')
      .select(`
        id,
        technician_performance (
          completed_visits,
          average_rating,
          on_time_arrival_rate,
          cancellation_rate,
          response_time_seconds
        )
      `)
      .eq('is_active', true);

    if (techError) {
      console.error('Error fetching technicians:', techError);
      throw techError;
    }

    console.log(`📊 Found ${technicians?.length || 0} active technicians`);

    const bonusRecords = [];
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

    for (const tech of technicians || []) {
      const perf = tech.technician_performance?.[0];
      if (!perf) continue;

      let commitmentBonus = 0;
      let qualityBonus = 0;
      let timeBonus = 0;
      let topRatedBonus = 0;
      let superProBonus = 0;

      // Commitment Bonus: 300 EGP for 25+ visits
      if (perf.completed_visits >= 25) {
        commitmentBonus = 300;
      }

      // Quality Bonus: 200 EGP for rating ≥ 4.8
      if (perf.average_rating >= 4.8) {
        qualityBonus = 200;
      }

      // Time Bonus: 150 EGP for on-time arrival ≥ 80%
      if (perf.on_time_arrival_rate >= 80) {
        timeBonus = 150;
      }

      // Top Rated Bonus: 500 EGP for 5-star performance
      if (perf.average_rating >= 4.8 && perf.completed_visits >= 20) {
        topRatedBonus = 500;
      }

      // Super Pro Bonus: 1000 EGP for 50+ visits
      if (perf.completed_visits >= 50) {
        superProBonus = 1000;
      }

      const totalBonus = commitmentBonus + qualityBonus + timeBonus + topRatedBonus + superProBonus;

      if (totalBonus > 0) {
        bonusRecords.push({
          technician_id: tech.id,
          bonus_month: currentMonth,
          commitment_bonus: commitmentBonus,
          quality_bonus: qualityBonus,
          time_bonus: timeBonus,
          top_rated_bonus: topRatedBonus,
          super_pro_bonus: superProBonus,
          total_bonus: totalBonus,
        });
      }
    }

    console.log(`💰 Calculated ${bonusRecords.length} bonus records`);

    // Upsert bonus records
    if (bonusRecords.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('technician_monthly_bonuses')
        .upsert(bonusRecords, {
          onConflict: 'technician_id,bonus_month',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('Error inserting bonuses:', insertError);
        throw insertError;
      }

      // Update wallet balances
      for (const bonus of bonusRecords) {
        await supabaseClient
          .from('technician_wallet')
          .update({
            balance_pending: bonus.total_bonus,
          })
          .eq('technician_id', bonus.technician_id);
      }
    }

    console.log('✅ Monthly bonuses calculated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        bonusesCalculated: bonusRecords.length,
        totalAmount: bonusRecords.reduce((sum, b) => sum + b.total_bonus, 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-monthly-bonuses:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});