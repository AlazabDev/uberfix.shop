import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";

interface Approval {
  id: string;
  approval_type: string;
  status: string;
  comments: string;
  approver_id: string;
  approved_at: string;
  created_at: string;
}

interface ApprovalManagerProps {
  requestId: string;
  approvalType: 'request' | 'materials' | 'completion' | 'billing';
}

export function ApprovalManager({ requestId, approvalType }: ApprovalManagerProps) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, [requestId, approvalType]);

  const fetchApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('request_approvals')
        .select('*')
        .eq('request_id', requestId)
        .eq('approval_type', approvalType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApprovals(data || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (status: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('request_approvals')
        .insert({
          request_id: requestId,
          approval_type: approvalType,
          approver_id: userData.user.id,
          status,
          comments,
          approved_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(status === 'approved' ? 'تمت الموافقة بنجاح' : 'تم الرفض');
      setComments('');
      fetchApprovals();
    } catch (error) {
      console.error('Error submitting approval:', error);
      toast.error('حدث خطأ أثناء معالجة الموافقة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getApprovalTypeLabel = (type: string) => {
    const labels = {
      request: 'موافقة على الطلب',
      materials: 'موافقة على المواد',
      completion: 'موافقة على الإنجاز',
      billing: 'موافقة على الفوترة'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'قيد الانتظار' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'موافق عليه' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'مرفوض' }
    };
    const config = variants[status as keyof typeof variants];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-4">جاري التحميل...</div>;
  }

  const latestApproval = approvals[0];
  const isPending = !latestApproval || latestApproval.status === 'pending';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{getApprovalTypeLabel(approvalType)}</span>
          {latestApproval && getStatusBadge(latestApproval.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Previous Approvals */}
        {approvals.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">سجل الموافقات</h4>
            {approvals.map((approval) => (
              <div key={approval.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  {getStatusBadge(approval.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(approval.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                {approval.comments && (
                  <div className="flex gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{approval.comments}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Approval Actions */}
        {isPending && (
          <div className="space-y-3 pt-3 border-t">
            <div className="space-y-2">
              <Label htmlFor="comments">تعليقات</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="أضف تعليقات أو ملاحظات..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleApproval('approved')}
                disabled={isSubmitting}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                موافقة
              </Button>
              <Button
                onClick={() => handleApproval('rejected')}
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                رفض
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
