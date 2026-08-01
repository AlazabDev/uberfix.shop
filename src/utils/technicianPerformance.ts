import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";
import { TechnicianPerformance, MonthlyExcellenceAward } from "@/types/technician";

export const calculateTechnicianPerformance = async (technicianId: string) => {
  try {
    // Get all completed tasks
    const { data: tasks } = await supabaseLegacy.from("technician_tasks")
      .select("*")
      .eq("technician_id", technicianId);

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
    const cancelledTasks = tasks?.filter(t => t.status === "cancelled").length || 0;

    // Get reviews
    const { data: reviews } = await supabaseLegacy.from("reviews")
      .select("rating")
      .eq("technician_id", technicianId);

    const averageRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    // Calculate scores (mock logic for now)
    const punctualityScore = 4.5;
    const qualityScore = 4.7;
    const professionalismScore = 4.8;

    // Calculate total points
    const totalPoints = (completedTasks * 10) + (reviews?.length || 0) * 20;

    // Update performance record
    const { error } = await supabaseLegacy.from("technician_performance")
      .upsert({
        technician_id: technicianId,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        cancelled_tasks: cancelledTasks,
        average_rating: averageRating,
        punctuality_score: punctualityScore,
        quality_score: qualityScore,
        professionalism_score: professionalismScore,
        total_points: totalPoints,
        last_calculated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return {
      totalPoints,
      averageRating,
      completedTasks,
    };
  } catch (error) {
    console.error("Error calculating performance:", error);
    throw error;
  }
};

export const checkLevelPromotion = async (technicianId: string) => {
  try {
    const { data: performance } = await supabaseLegacy.from("technician_performance")
      .select("*")
      .eq("technician_id", technicianId)
      .maybeSingle();

    const { data: level } = await supabaseLegacy.from("technician_levels")
      .select("*")
      .eq("technician_id", technicianId)
      .maybeSingle();

    if (!performance || !level) return null;

    let newLevel = level.current_level;
    let promoted = false;

    // Check for Pro promotion
    if (
      level.current_level === "technician" &&
      performance.completed_tasks >= 20 &&
      performance.average_rating >= 4.5 &&
      performance.total_points >= 80 &&
      performance.complaints_count === 0
    ) {
      newLevel = "pro";
      promoted = true;
    }

    // Check for Elite promotion
    if (
      level.current_level === "pro" &&
      performance.completed_tasks >= 50 &&
      performance.average_rating >= 4.8 &&
      performance.total_points >= 250 &&
      performance.complaints_count === 0
    ) {
      newLevel = "elite";
      promoted = true;
    }

    if (promoted) {
      const promotionHistory = [
        ...(Array.isArray(level.promotion_history) ? level.promotion_history : []),
        {
          from: level.current_level,
          to: newLevel,
          date: new Date().toISOString(),
          points: performance.total_points,
          rating: performance.average_rating,
        }
      ];

      await supabaseLegacy.from("technician_levels")
        .update({
          current_level: newLevel,
          level_updated_at: new Date().toISOString(),
          promotion_history: promotionHistory,
        })
        .eq("technician_id", technicianId);

      return { promoted: true, newLevel };
    }

    return { promoted: false, newLevel: level.current_level };
  } catch (error) {
    console.error("Error checking promotion:", error);
    return null;
  }
};

export const selectMonthlyWinners = async (month: string) => {
  try {
    const startDate = new Date(month);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Get all technicians with their performance
    const { data: performances } = await supabaseLegacy.from("technician_performance")
      .select(`
        *,
        technician:technicians(name, specialization, profile_image)
      `)
      .order("total_points", { ascending: false })
      .limit(3);

    if (!performances || performances.length === 0) return [];

    const winners: MonthlyExcellenceAward[] = [];

    for (let i = 0; i < Math.min(3, performances.length); i++) {
      const perf = performances[i];
      
      const award: MonthlyExcellenceAward = {
        id: "",
        technician_id: perf.technician_id,
        award_month: month,
        award_type: i === 0 ? "Gold" : i === 1 ? "Silver" : "Bronze",
        reward_description: i === 0 
          ? "معدات يدوية + 5000 جنيه + شهادة شكر" 
          : i === 1 
          ? "معدات يدوية + 3000 جنيه"
          : "معدات يدوية + 1500 جنيه",
        reward_value: i === 0 ? 5000 : i === 1 ? 3000 : 1500,
        created_at: new Date().toISOString(),
      };

      // Insert award
      const { data: inserted, error } = await supabaseLegacy.from("monthly_excellence_awards")
        .insert(award)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Error inserting award:", error);
        continue;
      }

      if (inserted) {
        winners.push(inserted as any);

        // Award badge
        await supabaseLegacy.from("technician_badges")
          .insert({
            technician_id: perf.technician_id,
            badge_type: "gold_monthly",
            badge_title: `فني الشهر ${award.award_type}`,
            badge_description: `حصل على المركز ${i + 1} في شهر ${month}`,
            awarded_for: month,
            awarded_at: new Date().toISOString(),
          });

        // Add to Hall of Excellence
        await supabaseLegacy.from("hall_of_excellence")
          .insert({
            technician_id: perf.technician_id,
            achievement_type: "monthly",
            achievement_title: `فني الشهر - ${award.award_type}`,
            achievement_description: `حصل على المركز ${i + 1} بإجمالي ${perf.total_points} نقطة`,
            achievement_date: month,
            display_order: i,
            is_featured: i === 0,
          });
      }
    }

    return winners;
  } catch (error) {
    console.error("Error selecting monthly winners:", error);
    return [];
  }
};
