import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileSignature, Loader2, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { TechnicianRegistrationData, TechnicianDocument } from "@/types/technician-registration";
import { buildW9Html, buildAcordHtml, renderHtmlToPdfBlob, downloadBlob } from "@/lib/legalForms";
import { SignaturePad } from "./SignaturePad";

type Kind = "w9" | "acord";

interface LegalFormDialogProps {
  open: boolean;
  kind: Kind;
  data: TechnicianRegistrationData;
  onOpenChange: (open: boolean) => void;
  /** Persist signature back into wizard data + (optionally) push a TechnicianDocument with attached PDF. */
  onSigned: (patch: Partial<TechnicianRegistrationData>, attachment?: TechnicianDocument) => void;
}

const META: Record<Kind, { title: string; subtitle: string; docType: TechnicianDocument["document_type"]; filePrefix: string }> = {
  w9: {
    title: "نموذج W-9 — البيانات الضريبية",
    subtitle: "مراجعة بياناتك الضريبية والتوقيع الإلكتروني",
    docType: "tax_card",
    filePrefix: "W9",
  },
  acord: {
    title: "شهادة تأمين المسؤولية المدنية والمهنية",
    subtitle: "مراجعة بيانات وثيقة التأمين والتوقيع الإلكتروني",
    docType: "insurance_certificate",
    filePrefix: "ACORD",
  },
};

export function LegalFormDialog({ open, kind, data, onOpenChange, onSigned }: LegalFormDialogProps) {
  const meta = META[kind];
  const existingSig = kind === "w9" ? data.w9_signature_data : data.acord_signature_data;
  const [signature, setSignature] = useState<string | undefined>(existingSig);
  const [acknowledged, setAcknowledged] = useState<boolean>(!!existingSig);
  const [typedName, setTypedName] = useState<string>(data.legal_name || data.full_name || "");
  const [busy, setBusy] = useState(false);

  const html = useMemo(() => {
    // Inject the live signature/name into a transient copy for preview/PDF
    const merged: TechnicianRegistrationData = {
      ...data,
      legal_name: typedName || data.legal_name,
      ...(kind === "w9"
        ? { w9_signature_data: signature, w9_signed_at: signature ? new Date().toISOString() : undefined }
        : { acord_signature_data: signature, acord_signed_at: signature ? new Date().toISOString() : undefined }),
    };
    return kind === "w9" ? buildW9Html(merged) : buildAcordHtml(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, signature, typedName, kind]);

  const buildBlob = async () => renderHtmlToPdfBlob(html);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await buildBlob();
      downloadBlob(blob, `${meta.filePrefix}-${data.full_name || "draft"}.pdf`);
    } catch (e) {
      toast.error("تعذر تجهيز ملف PDF");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return toast.error("اسمح بالنوافذ المنبثقة للطباعة");
    w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${meta.title}</title>
      <style>body{font-family:'Cairo','Segoe UI',Tahoma,sans-serif;margin:20px;background:#fff;}</style>
      </head><body>${html}<script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  };

  const handleSignAndSave = async () => {
    if (!signature) return toast.error("يرجى التوقيع أولاً");
    if (!acknowledged) return toast.error("يرجى تأكيد الإقرار");
    if (!typedName.trim()) return toast.error("اكتب اسمك القانوني");

    setBusy(true);
    try {
      const blob = await buildBlob();
      const file = new File([blob], `${meta.filePrefix}-${data.full_name || "form"}.pdf`, { type: "application/pdf" });
      const signedAt = new Date().toISOString();
      const patch: Partial<TechnicianRegistrationData> =
        kind === "w9"
          ? { w9_signature_data: signature, w9_signed_at: signedAt, legal_name: typedName }
          : { acord_signature_data: signature, acord_signed_at: signedAt, legal_name: typedName };

      const attachment: TechnicianDocument = {
        document_type: meta.docType,
        file_url: "",
        file_name: file.name,
        file_size: file.size,
        pending_file: file,
      };
      onSigned(patch, attachment);
      toast.success(`تم توقيع ${meta.title} وإرفاق نسخة PDF`);
      onOpenChange(false);
    } catch (e) {
      toast.error("تعذر حفظ النموذج");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSignature className="h-5 w-5 text-primary" />
            {meta.title}
          </DialogTitle>
          <DialogDescription>{meta.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-[1.4fr_1fr] gap-0 overflow-hidden flex-1">
          {/* Live preview */}
          <div className="overflow-y-auto border-l bg-muted/30 p-4">
            <div
              className="bg-white rounded shadow-sm mx-auto"
              style={{ width: 760, transform: "scale(0.78)", transformOrigin: "top center", direction: "rtl" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {/* Signing panel */}
          <div className="overflow-y-auto p-6 space-y-4">
            <div>
              <Label className="text-sm">الاسم القانوني (للتوقيع)</Label>
              <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="الاسم الثلاثي" />
            </div>

            <div>
              <Label className="text-sm mb-1 block">التوقيع الإلكتروني</Label>
              <SignaturePad value={signature} onChange={setSignature} />
            </div>

            <label className="flex gap-2 items-start cursor-pointer rounded-md border p-3 bg-muted/30">
              <Checkbox checked={acknowledged} onCheckedChange={(c) => setAcknowledged(!!c)} />
              <span className="text-xs leading-relaxed">
                أُقر بصحة جميع البيانات الواردة في هذا النموذج، وأوافق على معالجة UberFix لها وفق
                قانون حماية البيانات الشخصية رقم 151 لسنة 2020، وأتحمل المسؤولية القانونية عنها.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={handleDownload} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 ml-1" />}
                تنزيل PDF
              </Button>
              <Button type="button" variant="outline" onClick={handlePrint} disabled={busy}>
                <Printer className="h-4 w-4 ml-1" /> طباعة
              </Button>
            </div>

            {existingSig && !signature && (
              <p className="text-xs text-amber-600">⚠ التوقيع السابق سيتم استبداله</p>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t shrink-0 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>إلغاء</Button>
          <Button onClick={handleSignAndSave} disabled={busy || !signature || !acknowledged}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <CheckCircle2 className="h-4 w-4 ml-1" />}
            توقيع وحفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}