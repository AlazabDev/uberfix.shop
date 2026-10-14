import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useMutation } from "@tanstack/react-query";
import { Download, Loader2, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PROPERTY_STATUS, PROPERTY_TYPES } from "@/constants/propertyConstants";

import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizePropertyRows, normalizePropertyHeader, PROPERTY_IMPORT_COLUMNS, PROPERTY_IMPORT_MAX_BYTES, PROPERTY_IMPORT_MAX_ROWS, type ParsedPropertyRow } from "@/lib/propertyImport";
type ParsedRow = ParsedPropertyRow;
type OwnerOption = { id: string; label: string; companyId: string | null };
const VALID_TYPES = Object.keys(PROPERTY_TYPES);
const VALID_STATUS = Object.keys(PROPERTY_STATUS);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function PropertyBulkImport() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultText, setResultText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [skipExisting, setSkipExisting] = useState(true);

  const rows = useMemo(() => normalizePropertyRows(rawRows), [rawRows]);
  const validRows = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);
  const invalidCount = rows.length - validRows.length;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, auth_user_id, full_name, name, email, company_id")
        .eq("is_deleted", false)
        .order("full_name", { ascending: true })
        .limit(500);

      setOwners(
        (data ?? [])
          .map((p) => ({
            id: (p.auth_user_id as string | null) ?? (p.id as string),
            label: (p.full_name as string) || (p.name as string) || (p.email as string) || "بدون اسم",
            companyId: (p.company_id as string | null) ?? null,
          }))
          .filter((o) => !!o.id)
      );
    })();
  }, []);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (validRows.length === 0) throw new Error("لا توجد صفوف صالحة للاستيراد");

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;
      if (!currentUserId) throw new Error("يجب تسجيل الدخول أولًا");

      const managerId = ownerId || currentUserId;
      const ownerCompanyId = owners.find((o) => o.id === managerId)?.companyId ?? null;

      // مطابقة أسماء المدن والأحياء بالمعرفات
      const [{ data: cities }, { data: districts }] = await Promise.all([
        supabase.from("cities").select("id, name_ar"),
        supabase.from("districts").select("id, name_ar, city_id"),
      ]);

      const cityMap = new Map<string, number>();
      (cities ?? []).forEach((c) => cityMap.set(String(c.name_ar).trim(), c.id as number));
      const districtMap = new Map<string, number>();
      (districts ?? []).forEach((d) => districtMap.set(`${d.city_id}:${String(d.name_ar).trim()}`, d.id as number));

      const toResolve = validRows.map(r => {
        const cityId = r.city ? cityMap.get(r.city) : null;
        const districtId = r.district ? districtMap.get(`${cityId}:${r.district}`) : null;
        if (r.city && !cityId) throw new Error(`صف ${r.rowNumber}: المدينة غير معروفة: ${r.city}`);
        if (r.district && !districtId) throw new Error(`صف ${r.rowNumber}: الحي لا يتبع المدينة المحددة`);
        return { ...r, cityId, districtId };
      });
      let toInsert = toResolve;
      setProgress(0); setResultText("");
      let skipped = 0;

      if (skipExisting) {
        const existingNames = new Set<string>();
        for (let offset = 0; ; offset += 500) {
          const { data: existing, error } = await supabase.from("properties").select("name").eq("manager_id", managerId).range(offset, offset + 499);
          if (error) throw error;
          for (const p of existing || []) existingNames.add(p.name.trim().toLowerCase());
          if ((existing?.length || 0) < 500) break;
        }
        toInsert = toInsert.filter((r) => !existingNames.has(r.name.trim().toLowerCase()));
        skipped = validRows.length - toInsert.length;
      }

      let inserted = 0;
      for (const batch of chunk(toInsert, 200)) {
        const payload = batch.map((r) => ({
          name: r.name,
          type: r.type,
          status: r.status,
          address: r.address,
          city_id: r.cityId ?? null,
          district_id: r.districtId ?? null,
          latitude: r.latitude,
          longitude: r.longitude,
          area: r.area,
          floors: r.floors,
          rooms: r.rooms,
          bathrooms: r.bathrooms,
          parking_spaces: r.parking_spaces,
          code: r.code,
          description: r.description,
          manager_id: managerId,
          created_by: currentUserId,
          ...(ownerCompanyId ? { company_id: ownerCompanyId } : {}),
        }));

        const { error } = await supabase.from("properties").insert(payload);
        if (error) {
          setResultText(`تم حفظ ${inserted} عقار قبل توقف العملية. أعد المحاولة مع تفعيل تخطي الموجود.`);
          throw error;
        }
        inserted += payload.length;
        setProgress(Math.round(inserted / Math.max(1, toInsert.length) * 100));
      }

      return { inserted, skipped };
    },
    onSuccess: (res) => {
      setResultText(`اكتمل الاستيراد: ${res.inserted} عقار محفوظ، ${res.skipped} مكرر تم تخطيه.`);
      toast({
        title: "✅ تم الاستيراد",
        description: `أُضيف ${res.inserted} عقار${res.skipped ? ` (تم تخطي ${res.skipped} مكرر)` : ""}`,
      });
      setRawRows([]);
      setFileName("");
    },
    onError: (err: unknown) => {
      toast({
        title: "❌ فشل الاستيراد",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const downloadTemplate = async () => {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Properties");
    sheet.addRow(PROPERTY_IMPORT_COLUMNS);
    sheet.addRow(["فرع تجريبي", "القاهرة — عنوان العقار", "commercial", "active"]);
    sheet.columns.forEach(c => { c.width = 24; });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a"); link.href = url; link.download = "uberfix-properties-template.xlsx"; link.click(); URL.revokeObjectURL(url);
  };
  const handleFile = async (file: File | null) => {
    if (!file || reading || importMutation.isPending) return;
    setRawRows([]); setResultText(""); setProgress(0); setFileName("");
    try {
      if (file.size > PROPERTY_IMPORT_MAX_BYTES) throw new Error("الحد الأقصى لحجم الملف 10 ميجابايت");
      if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error("الملفات المقبولة XLSX أو CSV فقط");
      setReading(true);
      let parsed: ParsedRow[];
      if (/\.xlsx$/i.test(file.name)) {
        const { Workbook } = await import("exceljs");
        const book = new Workbook(); await book.xlsx.load(await file.arrayBuffer());
        const sheet = book.worksheets[0];
        if (!sheet) throw new Error("الملف لا يحتوي على ورقة بيانات");
        if (sheet.rowCount > PROPERTY_IMPORT_MAX_ROWS + 1) throw new Error("الحد الأقصى 10000 صف");
        const headers: string[] = [];
        sheet.getRow(1).eachCell((cell, col) => { headers[col - 1] = normalizePropertyHeader(cell.text); });
        parsed = [];
        sheet.eachRow((row, index) => {
          if (index === 1) return;
          const record: ParsedRow = {};
          headers.forEach((header, col) => { record[header] = row.getCell(col + 1).text; });
          parsed.push(record);
        });
      } else {
        const result = Papa.parse<ParsedRow>(await file.text(), { header: true, skipEmptyLines: true, transformHeader: normalizePropertyHeader });
        if (result.errors.length) throw new Error(result.errors[0].message);
        parsed = result.data;
      }
      if (!parsed.length) throw new Error("الملف لا يحتوي على صفوف");
      if (parsed.length > PROPERTY_IMPORT_MAX_ROWS) throw new Error("الحد الأقصى 10000 صف");
      setFileName(file.name); setRawRows(parsed);
    } catch (err) {
      toast({ title: "تعذر قراءة الملف", description: err instanceof Error ? err.message : "ملف غير صالح", variant: "destructive" });
    } finally { setReading(false); }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-bold">استيراد العقارات</h1><Button variant="outline" onClick={() => navigate("/properties")}>الرجوع إلى القائمة</Button></div>
      <section className="border rounded-md overflow-hidden bg-card">
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle className="text-2xl">استيراد العقارات دفعة واحدة</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Excel · CSV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المالك المسؤول عن كل العقارات *</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المالك" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                إذا لم تختر مالكًا سيتم ربط العقارات بحسابك الحالي.
              </p>
            </div>

            <div className="flex items-end justify-end"><Button variant="outline" className="gap-2" onClick={downloadTemplate}><Download className="h-4 w-4" />تحميل قالب Excel</Button></div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
            <div className="font-semibold">الأعمدة المقبولة</div>
            <div>
              إلزامية: <span className="font-mono">name</span>،{" "}
              <span className="font-mono">address</span>
            </div>
            <div>
              اختيارية: <span className="font-mono">type, status, city, district, latitude, longitude, area, floors, rooms, bathrooms, parking_spaces, code, description</span>
            </div>
            <div>
              أنواع مسموحة: <span className="font-mono">{VALID_TYPES.join(" | ")}</span> — حالات:{" "}
              <span className="font-mono">{VALID_STATUS.join(" | ")}</span>
            </div>
          </div>

          <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0] || null); }} className={`border-2 border-dashed rounded-md py-12 px-4 text-center space-y-3 ${dragging ? "border-primary bg-accent" : "border-border"}`}>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" /><p className="font-semibold">{reading ? "جاري قراءة الملف..." : fileName || "ملف العقارات"}</p>
            <p className="text-xs text-muted-foreground">XLSX / CSV · 10 ميجابايت · 10000 صف</p>
            <Input id="property-file" aria-label="ملف العقارات" type="file" accept=".csv,.xlsx" className="max-w-sm mx-auto" disabled={reading || importMutation.isPending} onChange={e => { void handleFile(e.target.files?.[0] || null); e.target.value = ""; }} />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="skipExisting"
              type="checkbox"
              checked={skipExisting}
              onChange={(e) => setSkipExisting(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="skipExisting">تخطي العقارات الموجودة لنفس المالك (حسب الاسم)</Label>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              صفوف مقروءة: {rows.length} — صالحة: {validRows.length}
              {invalidCount > 0 ? ` — بها أخطاء: ${invalidCount}` : ""}
              {fileName ? ` — الملف: ${fileName}` : ""}
            </div>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending || validRows.length === 0}
              className="gap-2"
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              تنفيذ الاستيراد
            </Button>
          </div>

          {(importMutation.isPending || progress > 0) && <Progress value={progress} aria-label="تقدم الاستيراد" />}
          {resultText && <p role="status" className="text-sm border-s-4 border-s-primary ps-3">{resultText}</p>}
          {rows.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الصف</TableHead><TableHead>الاسم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المدينة</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 15).map((r, idx) => (
                    <TableRow key={`${r.name}-${idx}`}>
                      <TableCell>{r.rowNumber}</TableCell><TableCell className="font-medium">{r.name || "—"}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell>{r.city || "-"}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{r.address || "-"}</TableCell>
                      <TableCell>
                        {r.errors.length === 0 ? (
                          <Badge variant="secondary">جاهز</Badge>
                        ) : (
                          <Badge variant="destructive">{r.errors.join("؛ ")}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 text-sm text-muted-foreground">عرض أول 15 صفًا للمعاينة.</div>
            </div>
          )}
        </CardContent>
      </section>
    </div>
  );
}
