import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseLegacy } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, Calendar, Award } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DailyStats {
  date: string;
  total_earnings: number;
  visits_completed: number;
  average_rating: number;
}

interface MonthlyBonus {
  month: string;
  commitment_bonus: number;
  quality_bonus: number;
  time_bonus: number;
  top_rated_bonus: number;
  super_pro_bonus: number;
  total_bonus: number;
  visits_completed: number;
  average_rating: number;
  status: string;
}

export default function TechnicianEarnings() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [monthlyBonuses, setMonthlyBonuses] = useState<MonthlyBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarningsThisMonth, setTotalEarningsThisMonth] = useState(0);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // جلب technician_id الصحيح عبر technician_profiles → technicians
      const { data: profile } = await supabaseLegacy.from('technician_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }

      const { data: techData } = await supabaseLegacy.from('technicians')
        .select('id')
        .eq('technician_profile_id', profile.id)
        .maybeSingle();

      if (!techData) { setLoading(false); return; }

      // Fetch daily stats (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: statsData } = await supabaseLegacy.from('technician_daily_stats')
        .select('*')
        .eq('technician_id', techData.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      setDailyStats(statsData || []);

      // Calculate total earnings this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);

      const thisMonthStats = (statsData || []).filter(
        (stat) => new Date(stat.date) >= firstDayOfMonth
      );

      const total = thisMonthStats.reduce((sum, stat) => sum + parseFloat(stat.total_earnings.toString()), 0);
      setTotalEarningsThisMonth(total);

      // Fetch monthly bonuses
      const { data: bonusesData } = await supabaseLegacy.from('technician_monthly_bonuses')
        .select('*')
        .eq('technician_id', techData.id)
        .order('month', { ascending: false })
        .limit(12);

      setMonthlyBonuses(bonusesData || []);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <h1 className="text-3xl font-bold">الأرباح والمكافآت</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">أرباح اليوم</span>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {dailyStats[dailyStats.length - 1]?.total_earnings?.toFixed(2) || '0.00'} جنيه
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">أرباح الشهر</span>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {totalEarningsThisMonth.toFixed(2)} جنيه
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">المكافآت</span>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            {monthlyBonuses[0]?.total_bonus?.toFixed(2) || '0.00'} جنيه
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">إجمالي الزيارات</span>
            <Calendar className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {dailyStats.reduce((sum, stat) => sum + stat.visits_completed, 0)}
          </p>
        </Card>
      </div>

      {/* Earnings Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">تطور الأرباح (آخر 30 يوم)</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                className="text-xs"
              />
              <YAxis width={60} className="text-xs" />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  const date = new Date(item.payload.date).toLocaleDateString('ar-EG');
                  return (
                    <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                      <p className="font-medium">{date}</p>
                      <p className="text-green-600">
                        الأرباح: {Number(item.value).toFixed(2)} جنيه
                      </p>
                      <p className="text-sm text-muted-foreground">
                        الزيارات: {item.payload.visits_completed}
                      </p>
                    </div>
                  );
                }}
              />
              <Area 
                type="monotone" 
                dataKey="total_earnings" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Monthly Bonuses */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          المكافآت الشهرية
        </h2>

        <Tabs defaultValue="current">
          <TabsList className="mb-4">
            <TabsTrigger value="current">الشهر الحالي</TabsTrigger>
            <TabsTrigger value="history">السجل</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            {monthlyBonuses.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-muted-foreground">مكافأة الالتزام</p>
                  <p className="text-xl font-bold text-green-600">
                    {monthlyBonuses[0]?.commitment_bonus || 0} جنيه
                  </p>
                </Card>
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-muted-foreground">مكافأة الجودة</p>
                  <p className="text-xl font-bold text-blue-600">
                    {monthlyBonuses[0]?.quality_bonus || 0} جنيه
                  </p>
                </Card>
                <Card className="p-4 bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-sm text-muted-foreground">مكافأة الوقت</p>
                  <p className="text-xl font-bold text-purple-600">
                    {monthlyBonuses[0]?.time_bonus || 0} جنيه
                  </p>
                </Card>
                <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20">
                  <p className="text-sm text-muted-foreground">مكافأة Top Rated</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {monthlyBonuses[0]?.top_rated_bonus || 0} جنيه
                  </p>
                </Card>
                <Card className="p-4 bg-red-50 dark:bg-red-900/20">
                  <p className="text-sm text-muted-foreground">مكافأة Super Pro</p>
                  <p className="text-xl font-bold text-red-600">
                    {monthlyBonuses[0]?.super_pro_bonus || 0} جنيه
                  </p>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-3">
              {monthlyBonuses.map((bonus, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{bonus.month}</p>
                      <p className="text-sm text-muted-foreground">
                        {bonus.visits_completed} زيارة • تقييم {bonus.average_rating?.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-bold text-green-600">
                        {bonus.total_bonus?.toFixed(2)} جنيه
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        bonus.status === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {bonus.status === 'paid' ? 'مدفوع' : 'قيد المعالجة'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}