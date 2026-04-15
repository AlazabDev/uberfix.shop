import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Phone, Send, Loader2 } from 'lucide-react';
import type { WATemplate } from '@/hooks/useWhatsAppTemplates';

interface SendTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WATemplate | null;
  onSend: (templateId: string, phone: string, parameters?: { header?: string[]; body?: string[] }) => Promise<void>;
  isSending: boolean;
}

export function SendTestDialog({ open, onOpenChange, template, onSend, isSending }: SendTestDialogProps) {
  const [phone, setPhone] = useState('+1234567890');
  const [bodyParams, setBodyParams] = useState<string[]>([]);
  const [headerParams, setHeaderParams] = useState<string[]>([]);

  // Count placeholders in body and header
  const bodyPlaceholderCount = useMemo(() => {
    if (!template?.body_text) return 0;
    const matches = template.body_text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  }, [template?.body_text]);

  const headerPlaceholderCount = useMemo(() => {
    if (!template?.header_content) return 0;
    const matches = template.header_content.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  }, [template?.header_content]);

  useEffect(() => {
    setBodyParams(Array(bodyPlaceholderCount).fill(''));
    setHeaderParams(Array(headerPlaceholderCount).fill(''));
  }, [bodyPlaceholderCount, headerPlaceholderCount]);

  if (!template) return null;

  // Build preview text with replacements
  const previewBody = template.body_text?.replace(/\{\{(\d+)\}\}/g, (_, num) => {
    const idx = parseInt(num) - 1;
    return bodyParams[idx] || `{{${num}}}`;
  }) || '';

  const previewHeader = template.header_content?.replace(/\{\{(\d+)\}\}/g, (_, num) => {
    const idx = parseInt(num) - 1;
    return headerParams[idx] || `{{${num}}}`;
  }) || '';

  const handleSend = async () => {
    if (!phone.trim()) return;
    
    // التحقق من أن جميع المتغيرات المطلوبة مملوءة
    if (bodyPlaceholderCount > 0 && bodyParams.some(p => !p.trim())) {
      return; // لا ترسل إذا هناك متغيرات فارغة
    }
    if (headerPlaceholderCount > 0 && headerParams.some(p => !p.trim())) {
      return;
    }

    const params: { header?: string[]; body?: string[] } = {};
    if (headerParams.length > 0 && headerParams.some(p => p.trim())) {
      params.header = headerParams.map(p => p.trim());
    }
    if (bodyParams.length > 0 && bodyParams.some(p => p.trim())) {
      params.body = bodyParams.map(p => p.trim());
    }
    await onSend(template.id, phone, Object.keys(params).length ? params : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>إرسال رسالة اختبار</DialogTitle>
          <DialogDescription>
            إرسال رسالة اختبار باستخدام قالب "{template.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 px-1">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              رقم الهاتف
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              dir="ltr"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              أضف رمز البلد (مثال: ‎+20 لمصر، ‎+1 لأمريكا)
            </p>
          </div>

          {/* Body Parameters */}
          {bodyPlaceholderCount > 0 && (
            <div className="space-y-2">
              <Label>متغيرات نص الرسالة ({bodyPlaceholderCount} params)</Label>
              {Array.from({ length: bodyPlaceholderCount }, (_, i) => (
                <Input
                  key={i}
                  value={bodyParams[i] || ''}
                  onChange={(e) => {
                    const updated = [...bodyParams];
                    updated[i] = e.target.value;
                    setBodyParams(updated);
                  }}
                  placeholder={`{{${i + 1}}}`}
                  dir="rtl"
                />
              ))}
            </div>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <Label>معاينة</Label>
            <div className="bg-[#efeae2] rounded-lg p-4">
              <div className="bg-white rounded-lg shadow-sm max-w-full overflow-hidden">
                {/* Header */}
                {template.header_type === 'text' && previewHeader && (
                  <div className="p-3 pb-0">
                    <p className="font-bold text-sm text-foreground" dir="rtl">{previewHeader}</p>
                  </div>
                )}

                {/* Body */}
                <div className="p-3">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" dir="rtl">
                    {previewBody}
                  </p>
                </div>

                {/* Footer */}
                {template.footer_text && (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-muted-foreground" dir="rtl">{template.footer_text}</p>
                  </div>
                )}

                {/* Buttons */}
                {template.buttons && template.buttons.length > 0 && (
                  <div className="border-t">
                    {template.buttons.map((btn, i) => (
                      <div key={i} className="text-center py-2 text-sm text-[#00a884] border-b last:border-b-0">
                        {btn.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSend} disabled={isSending || !phone.trim() || (bodyPlaceholderCount > 0 && bodyParams.some(p => !p.trim())) || (headerPlaceholderCount > 0 && headerParams.some(p => !p.trim()))}>
            {isSending ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 ml-2" />
            )}
            إرسال اختبار
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
