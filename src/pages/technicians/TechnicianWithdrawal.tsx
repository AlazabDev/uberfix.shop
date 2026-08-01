import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { supabaseLegacy } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Wallet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const withdrawalSchema = z.object({
  amount: z.number().min(300, "الحد الأدنى للسحب 300 جنيه"),
  method: z.enum(['vodafone_cash', 'bank_transfer', 'instapay', 'wallet']),
  account_number: z.string().trim().min(5, "رقم الحساب مطلوب"),
  account_name: z.string().trim().min(2, "اسم الحساب مطلوب"),
  notes: z.string().optional(),
});

type WithdrawalForm = z.infer<typeof withdrawalSchema>;

export default function TechnicianWithdrawal() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
  });

  const selectedMethod = watch('method');

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: techData } = await supabaseLegacy.from('technicians')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!techData) {
        toast({ title: "خطأ", description: "لم يتم العثور على حساب الفني", variant: "destructive" });
        return;
      }

      setTechnicianId(techData.id);

      const { data: walletData } = await supabaseLegacy.from('technician_wallet')
        .select('balance_current')
        .eq('technician_id', techData.id)
        .single();

      if (walletData) {
        setBalance(walletData.balance_current);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const onSubmit = async (data: WithdrawalForm) => {
    if (!technicianId) {
      toast({ title: "خطأ", description: "لم يتم تحديد الفني", variant: "destructive" });
      return;
    }

    if (data.amount > balance) {
      toast({ title: "خطأ", description: "الرصيد غير كافٍ", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const accountDetails = {
        method: data.method,
        account_number: data.account_number,
        account_name: data.account_name,
      };

      const { error } = await supabaseLegacy.from('technician_withdrawals')
        .insert({
          technician_id: technicianId,
          amount: data.amount,
          method: data.method,
          account_details: accountDetails,
          notes: data.notes,
          status: 'pending',
        });

      if (error) throw error;

      // Update wallet - lock the withdrawn amount
      const { error: walletError } = await supabaseLegacy.from('technician_wallet')
        .update({
          balance_current: balance - data.amount,
          balance_locked: balance - data.amount, // Lock it until processed
        })
        .eq('technician_id', technicianId);

      if (walletError) throw walletError;

      toast({
        title: "تم إرسال الطلب بنجاح",
        description: "سيتم مراجعة طلبك وتحويل المبلغ خلال 48 ساعة",
      });

      navigate('/technicians/wallet');
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: "خطأ في إرسال الطلب",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      vodafone_cash: 'فودافون كاش',
      bank_transfer: 'تحويل بنكي',
      instapay: 'InstaPay',
      wallet: 'محفظة إلكترونية',
    };
    return labels[method] || method;
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/technicians/wallet')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">طلب سحب</h1>
          <p className="text-muted-foreground">اسحب أرباحك إلى حسابك</p>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">الرصيد المتاح للسحب</p>
            <p className="text-4xl font-bold text-primary">{balance.toFixed(2)} جنيه</p>
          </div>
          <Wallet className="h-12 w-12 text-primary opacity-50" />
        </div>
      </Card>

      {/* Withdrawal Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Amount */}
          <div>
            <Label htmlFor="amount">المبلغ المطلوب سحبه *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="300.00"
              {...register('amount', { valueAsNumber: true })}
              className="text-lg"
            />
            {errors.amount && (
              <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">الحد الأدنى للسحب: 300 جنيه</p>
          </div>

          {/* Method */}
          <div>
            <Label htmlFor="method">طريقة السحب *</Label>
            <Select
              onValueChange={(value) => setValue('method', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر طريقة السحب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                <SelectItem value="instapay">InstaPay</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="wallet">محفظة إلكترونية</SelectItem>
              </SelectContent>
            </Select>
            {errors.method && (
              <p className="text-sm text-destructive mt-1">{errors.method.message}</p>
            )}
          </div>

          {/* Account Number */}
          <div>
            <Label htmlFor="account_number">
              {selectedMethod === 'vodafone_cash' ? 'رقم الهاتف' : 
               selectedMethod === 'bank_transfer' ? 'رقم الحساب البنكي' :
               selectedMethod === 'instapay' ? 'رقم الهاتف/الحساب' :
               'رقم الحساب'} *
            </Label>
            <Input
              id="account_number"
              placeholder={
                selectedMethod === 'vodafone_cash' ? '01xxxxxxxxx' :
                selectedMethod === 'bank_transfer' ? 'رقم الحساب' :
                'رقم الحساب'
              }
              {...register('account_number')}
            />
            {errors.account_number && (
              <p className="text-sm text-destructive mt-1">{errors.account_number.message}</p>
            )}
          </div>

          {/* Account Name */}
          <div>
            <Label htmlFor="account_name">اسم صاحب الحساب *</Label>
            <Input
              id="account_name"
              placeholder="الاسم كما هو مسجل في الحساب"
              {...register('account_name')}
            />
            {errors.account_name && (
              <p className="text-sm text-destructive mt-1">{errors.account_name.message}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Input
              id="notes"
              placeholder="أي ملاحظات إضافية"
              {...register('notes')}
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="text-sm space-y-1 mr-4">
                <li>• سيتم مراجعة الطلب خلال 24 ساعة</li>
                <li>• مدة التحويل: 48 ساعة كحد أقصى</li>
                <li>• تأكد من صحة بيانات الحساب قبل الإرسال</li>
                <li>• الحد الأدنى للسحب: 300 جنيه</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'جاري الإرسال...' : 'إرسال طلب السحب'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
