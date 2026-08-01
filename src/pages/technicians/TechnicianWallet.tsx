import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { supabaseLegacy } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Clock, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WalletData {
  balance_current: number;
  balance_pending: number;
  balance_locked: number;
  total_earnings: number;
  total_withdrawn: number;
  minimum_withdrawal: number;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  description: string;
  status: string;
  created_at: string;
}

export default function TechnicianWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // جلب technician_id الصحيح عبر technician_profiles → technicians
      const { data: profile } = await supabaseLegacy.from('technician_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        toast({ title: "خطأ", description: "لم يتم العثور على ملف تسجيل الفني", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: techData } = await supabaseLegacy.from('technicians')
        .select('id')
        .eq('technician_profile_id', profile.id)
        .maybeSingle();

      if (!techData) {
        toast({ title: "خطأ", description: "لم يتم العثور على حساب الفني", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Get or create wallet
      const { data, error } = await supabaseLegacy.from('technician_wallet')
        .select('*')
        .eq('technician_id', techData.id)
        .single();

      let walletData = data;

      if (error && error.code === 'PGRST116') {
        const { data: newWallet } = await supabaseLegacy.from('technician_wallet')
          .insert({ technician_id: techData.id })
          .select()
          .single();
        walletData = newWallet;
      }

      setWallet(walletData);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      toast({ title: "خطأ", description: "فشل تحميل بيانات المحفظة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabaseLegacy.from('technician_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const { data: techData } = await supabaseLegacy.from('technicians')
        .select('id')
        .eq('technician_profile_id', profile.id)
        .maybeSingle();

      if (!techData) return;

      const { data } = await supabaseLegacy.from('technician_transactions')
        .select('*')
        .eq('technician_id', techData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning': return <ArrowDownRight className="text-green-500" />;
      case 'withdrawal': return <ArrowUpRight className="text-red-500" />;
      case 'bonus': return <TrendingUp className="text-blue-500" />;
      case 'penalty': return <ArrowUpRight className="text-orange-500" />;
      default: return <DollarSign className="text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      earning: 'أرباح زيارة',
      withdrawal: 'سحب',
      bonus: 'مكافأة',
      penalty: 'غرامة',
      refund: 'استرجاع',
      adjustment: 'تعديل'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">لا توجد بيانات محفظة</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المحفظة المالية</h1>
          <p className="text-muted-foreground">إدارة أرباحك وطلبات السحب</p>
        </div>
        <Button onClick={() => navigate('/technicians/withdrawal')} className="gap-2">
          <Wallet className="h-4 w-4" />
          طلب سحب
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">الرصيد المتاح</span>
            <Wallet className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {wallet.balance_current.toFixed(2)} جنيه
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">رصيد معلق</span>
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {wallet.balance_pending.toFixed(2)} جنيه
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">إجمالي الأرباح</span>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {wallet.total_earnings.toFixed(2)} جنيه
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">المسحوبات</span>
            <ArrowUpRight className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            {wallet.total_withdrawn.toFixed(2)} جنيه
          </p>
        </Card>
      </div>

      {/* Transactions */}
      <Card className="p-6">
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">كل المعاملات</TabsTrigger>
            <TabsTrigger value="earnings">الأرباح</TabsTrigger>
            <TabsTrigger value="withdrawals">السحوبات</TabsTrigger>
            <TabsTrigger value="bonuses">المكافآت</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد معاملات</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.transaction_type)}
                    <div>
                      <p className="font-medium">{getTransactionLabel(tx.transaction_type)}</p>
                      <p className="text-sm text-muted-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`text-lg font-bold ${tx.transaction_type === 'earning' || tx.transaction_type === 'bonus' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transaction_type === 'earning' || tx.transaction_type === 'bonus' ? '+' : '-'}
                      {tx.net_amount.toFixed(2)} جنيه
                    </p>
                    {tx.platform_fee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        عمولة المنصة: {tx.platform_fee.toFixed(2)} جنيه
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="earnings">
            {transactions.filter(t => t.transaction_type === 'earning').map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-muted rounded-lg mb-3">
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="text-green-500" />
                  <div>
                    <p className="font-medium">أرباح زيارة</p>
                    <p className="text-sm text-muted-foreground">{tx.description}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-green-600">
                  +{tx.net_amount.toFixed(2)} جنيه
                </p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="withdrawals">
            {transactions.filter(t => t.transaction_type === 'withdrawal').map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-muted rounded-lg mb-3">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="text-red-500" />
                  <div>
                    <p className="font-medium">سحب</p>
                    <p className="text-sm text-muted-foreground">{tx.description}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-red-600">
                  -{tx.net_amount.toFixed(2)} جنيه
                </p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="bonuses">
            {transactions.filter(t => t.transaction_type === 'bonus').map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-muted rounded-lg mb-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-blue-500" />
                  <div>
                    <p className="font-medium">مكافأة</p>
                    <p className="text-sm text-muted-foreground">{tx.description}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  +{tx.net_amount.toFixed(2)} جنيه
                </p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
