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

type ParsedRow = Record<string, unknown>;

type NormalizedRow = {
  name: string;
  type: string;
  status: string;
  address: string;
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  area: number | null;
  floors: number | null;
  rooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  code: string | null;
  description: string | null;
  errors: string[];
};

type OwnerOption = { id: string; label: string };

const VALID_TYPES = Object.keys(PROPERTY_TYPES);
const VALID_STATUS = Object.keys(PROPERTY_STATUS);

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function pick(row: ParsedRow, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function toNum(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toInt(value: string | null): number | null {
  const n = toNum(value);
  return n === null ? null : Math.round(n);
}

function normalizeRows(rows: ParsedRow[]): NormalizedRow[] {
  return rows
    .map((raw) => {
      const name = pick(raw, ["name", "property_name", "الاسم", "اسم_العقار"]);
      if (!name) return null;

      const type = (pick(raw, ["type", "category", "النوع"]) ?? "commercial").toLowerCase();
      const status = (pick(raw, ["status", "الحالة"]) ?? "active").toLowerCase();
      const address = pick(raw, ["address", "location", "العنوان"]) ?? "";

      const errors: string[] = [];
      if (!VALID_TYPES.includes(type)) errors.push(`نوع غير معروف: ${type}`);
      if (!VALID_STATUS.includes(status)) errors.push(`حالة غير معروفة: ${status}`);
      if (address.trim().length < 5) errors.push("العنوان قصير جدًا");

      return {
        name,
        type,
        status,
        address,
        city: pick(raw, ["city", "governorate", "المدينة", "المحافظة"]),
        district: pick(raw, ["district", "area", "الحي", "المنطقة"]),
        latitude: toNum(pick(raw, ["latitude", "lat", "خط_العرض"])),
        longitude: toNum(pick(raw, ["longitude", "lng", "long", "خط_الطول"])),
        area: toNum(pick(raw, ["area_sqm", "space", "المساحة"])),
        floors: toInt(pick(raw, ["floors", "الادوار", "الطوابق"])),
        rooms: toInt(pick(raw, ["rooms", "الغرف"])),
        bathrooms: toInt(pick(raw, ["bathrooms", "الحمامات"])),
        parking_spaces: toInt(pick(raw, ["parking_spaces", "parking", "مواقف"])),
        code: pick(raw, ["code", "property_code", "الكود"]),
        description: pick(raw, ["description", "notes", "الوصف", "ملاحظات"]),
        errors,
      } satisfies NormalizedRow;
    })
    .filter(Boolean) as NormalizedRow[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function PropertyBulkImport() {
  const { toast } = useToast();
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [skipExisting, setSkipExisting] = useState(true);

  const rows = useMemo(() => normalizeRows(rawRows), [rawRows]);
  const validRows = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);
  const invalidCount = rows.length - validRows.length;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, auth_user_id, full_name, name, email")
        .eq("is_deleted", false)
        .order("full_name", { ascending: true })
        .limit(500);

      setOwners(
        (data ?? [])
          .map((p) => ({
            id: (p.auth_user_id as string | null) ?? (p.id as string),
            label: (p.full_name as string) || (p.name as string) || (p.email as string) || "بدون اسم",
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

      // مطابقة أسماء المدن والأحياء بالمعرفات
      const [{ data: cities }, { data: districts }] = await Promise.all([
        supabase.from("cities").select("id, name_ar"),
        supabase.from("districts").select("id, name_ar, city_id"),
      ]);

      const cityMap = new Map<string, number>();
      (cities ?? []).forEach((c) => cityMap.set(String(c.name_ar).trim(), c.id as number));
      const districtMap = new Map<string, number>();
      (districts ?? []).forEach((d) => districtMap.set(String(d.name_ar).trim(), d.id as number));

      let toInsert = validRows;
      let skipped = 0;

      if (skipExisting) {
        const { data: existing } = await supabase
          .from("properties")
          .select("name")
          .eq("manager_id", managerId);
        const existingNames = new Set(
          (existing ?? []).map((p) => String(p.name ?? "").trim().toLowerCase())
        );
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
          city_id: r.city ? cityMap.get(r.city) ?? null : null,
          district_id: r.district ? districtMap.get(r.district) ?? null : null,
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
        }));

        const { error } = await supabase.from("properties").insert(payload);
        if (error) throw error;
        inserted += payload.length;
      }

      return { inserted, skipped };
    },
    onSuccess: (res) => {
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

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const result = Papa.parse<ParsedRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });
    if (result.errors?.length) {
      toast({
        title: "⚠️ مشكلة في قراءة الملف",
        description: result.errors[0]?.message || "تعذر قراءة ملف CSV",
        variant: "destructive",
      });
    }
    setRawRows((result.data || []).filter(Boolean));
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">إضافة عقارات بالجملة</CardTitle>
          <CardDescription>
            ارفع ملف CSV يحتوي على العقارات، واختر المالك المسؤول عنها جميعًا، ثم نفّذ الاستيراد.
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

            <div className="space-y-2">
              <Label htmlFor="csv">ملف CSV *</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <a
                href="/data/properties_sample.csv"
                download
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                تحميل ملف المثال (دليل الأعمدة)
              </a>
            </div>
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

          {rows.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المدينة</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 15).map((r, idx) => (
                    <TableRow key={`${r.name}-${idx}`}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell>{r.city || "-"}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{r.address || "-"}</TableCell>
                      <TableCell>
                        {r.errors.length === 0 ? (
                          <Badge variant="secondary">جاهز</Badge>
                        ) : (
                          <Badge variant="destructive">{r.errors[0]}</Badge>
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
      </Card>
    </div>
  );
}
