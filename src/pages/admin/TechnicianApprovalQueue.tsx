import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, CheckCircle, XCircle, Eye, FileText, MapPin, Phone, Mail, Building2, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TechnicianProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_type: string;
  full_name: string;
  email: string;
  phone: string;
  city_id: number;
  district_id: number;
  street_address: string;
  status: string;
  created_at: string;
  additional_notes: string;
  has_insurance: boolean;
  insurance_company_name: string;
  policy_number: string;
  accepts_emergency_jobs: boolean;
  accepts_national_contracts: boolean;
}

interface TechnicianDocument {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string;
}

interface TechnicianTrade {
  id: string;
  category_id: number;
  category_name: string;
  years_of_experience: number;
  can_handle_heavy_projects: boolean;
}

export default function TechnicianApprovalQueue() {
  const [profiles, setProfiles] = useState<TechnicianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<TechnicianProfile | null>(null);
  const [documents, setDocuments] = useState<TechnicianDocument[]>([]);
  const [trades, setTrades] = useState<TechnicianTrade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending_review');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, [activeTab]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('technician_profiles')
        .select('*')
        .eq('status', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      toast({ title: 'خطأ في تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileDetails = async (profile: TechnicianProfile) => {
    setSelectedProfile(profile);
    
    // Fetch documents
    const { data: docs } = await supabase
      .from('technician_documents')
      .select('*')
      .eq('technician_id', profile.id);
    setDocuments(docs || []);

    // Fetch trades
    const { data: tradesData } = await supabase
      .from('technician_trades')
      .select('*')
      .eq('technician_id', profile.id);
    setTrades(tradesData || []);
  };

  const handleApprove = async () => {
    if (!selectedProfile) return;
    
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-technician', {
        body: {
          profileId: selectedProfile.id,
          action: 'approve'
        }
      });

      if (error) throw error;

      toast({ title: 'تم قبول الفني بنجاح', description: 'سيتم إرسال إشعار للفني' });
      setSelectedProfile(null);
      fetchProfiles();
    } catch (err) {
      console.error('Error approving:', err);
      toast({ title: 'خطأ في قبول الطلب', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProfile || !rejectionReason.trim()) {
      toast({ title: 'يرجى إدخال سبب الرفض', variant: 'destructive' });
      return;
    }
    
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('approve-technician', {
        body: {
          profileId: selectedProfile.id,
          action: 'reject',
          rejectionReason: rejectionReason
        }
      });

      if (error) throw error;

      toast({ title: 'تم رفض الطلب', description: 'سيتم إرسال إشعار للفني' });
      setSelectedProfile(null);
      setShowRejectDialog(false);
      setRejectionReason('');
      fetchProfiles();
    } catch (err) {
      console.error('Error rejecting:', err);
      toast({ title: 'خطأ في رفض الطلب', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  const getCompanyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      individual: 'فرد',
      small_team: 'فريق صغير',
      company: 'شركة'
    };
    return types[type] || type;
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      tax_card: 'البطاقة الضريبية',
      commercial_registration: 'السجل التجاري',
      national_id: 'بطاقة الرقم القومي',
      insurance_certificate: 'شهادة التأمين',
      professional_license: 'رخصة مهنية'
    };
    return types[type] || type;
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة طلبات الفنيين</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredProfiles.length} طلب
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending_review">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="approved">مقبول</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض</TabsTrigger>
        </TabsList>

        <div className="my-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الشركة أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد طلبات في هذه الفئة
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((profile) => (
                <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{profile.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{profile.company_name}</p>
                      </div>
                      <Badge variant="secondary">{getCompanyTypeLabel(profile.company_type)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span dir="ltr">{profile.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(profile.created_at), 'dd MMM yyyy', { locale: ar })}</span>
                    </div>
                    
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => fetchProfileDetails(profile)}
                    >
                      <Eye className="h-4 w-4 ml-2" />
                      عرض التفاصيل
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Profile Details Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب التسجيل</DialogTitle>
          </DialogHeader>
          
          {selectedProfile && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">الاسم الكامل</label>
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedProfile.full_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">اسم الشركة</label>
                    <p className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {selectedProfile.company_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">الهاتف</label>
                    <p className="font-medium" dir="ltr">{selectedProfile.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">البريد الإلكتروني</label>
                    <p className="font-medium">{selectedProfile.email}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-sm text-muted-foreground">العنوان</label>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedProfile.street_address}
                    </p>
                  </div>
                </div>

                {/* Insurance */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">التأمين</h4>
                  {selectedProfile.has_insurance ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">شركة التأمين</label>
                        <p>{selectedProfile.insurance_company_name || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">رقم الوثيقة</label>
                        <p>{selectedProfile.policy_number || '-'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">لا يوجد تأمين</p>
                  )}
                </div>

                {/* Trades */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">التخصصات</h4>
                  {trades.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {trades.map((trade) => (
                        <Badge key={trade.id} variant="outline">
                          {trade.category_name} ({trade.years_of_experience} سنة)
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">لم يتم تحديد تخصصات</p>
                  )}
                </div>

                {/* Documents */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">المستندات</h4>
                  {documents.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={async () => {
                            // file_url may be a storage key (preferred) or a legacy
                            // full URL. Generate a fresh signed URL on click.
                            const isFullUrl = /^https?:\/\//i.test(doc.file_url);
                            let url = doc.file_url;
                            if (!isFullUrl) {
                              const { data, error } = await supabase.storage
                                .from('technician-registration-docs')
                                .createSignedUrl(doc.file_url, 60 * 10);
                              if (error || !data) {
                                toast({ title: 'تعذر فتح الملف', description: error?.message, variant: 'destructive' });
                                return;
                              }
                              url = data.signedUrl;
                            }
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="flex items-center gap-2 p-2 border rounded hover:bg-accent transition-colors text-right"
                        >
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium">{getDocumentTypeLabel(doc.document_type)}</span>
                            <span className="text-xs text-muted-foreground truncate" dir="auto">{doc.file_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">لا توجد مستندات</p>
                  )}
                </div>

                {/* Notes */}
                {selectedProfile.additional_notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">ملاحظات إضافية</h4>
                    <p className="text-sm">{selectedProfile.additional_notes}</p>
                  </div>
                )}

                {/* Capabilities */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">القدرات</h4>
                  <div className="flex gap-4">
                    <Badge variant={selectedProfile.accepts_emergency_jobs ? 'default' : 'secondary'}>
                      {selectedProfile.accepts_emergency_jobs ? '✓' : '✗'} أعمال طوارئ
                    </Badge>
                    <Badge variant={selectedProfile.accepts_national_contracts ? 'default' : 'secondary'}>
                      {selectedProfile.accepts_national_contracts ? '✓' : '✗'} عقود وطنية
                    </Badge>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {selectedProfile?.status === 'pending_review' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 ml-2" />
                رفض
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 ml-2" />
                )}
                قبول
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>سبب الرفض</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="اكتب سبب رفض الطلب..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد الرفض'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
