import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const TABLE_OPTIONS = [
  { value: "stores", label: "الفروع / المتاجر", icon: "🏪" },
  { value: "rate_items", label: "بنود الأسعار", icon: "💰" },
  { value: "malls", label: "دليل المولات", icon: "🏬" },
];

export default function DataImport() {
  const { toast } = useToast();
  const [table, setTable] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    setDone(false);
    const text = await f.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    setRowCount(result.data.length);
  };

  const handleImport = async () => {
    if (!file || !table) return;
    setLoading(true);
    setProgress(10);

    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = result.data as Record<string, unknown>[];
      setProgress(30);

      // Clean rows - remove empty strings, convert nulls
      const cleaned = rows.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          if (v === "" || v === undefined) out[k] = null;
          else out[k] = v;
        }
        return out;
      });

      setProgress(50);

      const { data, error } = await supabase.functions.invoke("bulk-import-csv", {
        body: { table, rows: cleaned },
      });

      setProgress(100);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDone(true);
      toast({
        title: "✅ تم الاستيراد بنجاح",
        description: `تم إدخال ${data.inserted} سجل في جدول ${TABLE_OPTIONS.find(t => t.value === table)?.label}`,
      });
    } catch (err: any) {
      toast({
        title: "❌ فشل الاستيراد",
        description: err?.message || "حدث خطأ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            استيراد بيانات CSV
          </CardTitle>
          <CardDescription>رفع ملفات CSV لاستيرادها إلى قاعدة البيانات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>اختر الجدول المستهدف</Label>
            <Select value={table} onValueChange={setTable}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الجدول..." />
              </SelectTrigger>
              <SelectContent>
                {TABLE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ملف CSV</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {rowCount > 0 && (
              <p className="text-sm text-muted-foreground">
                عدد السجلات: <span className="font-bold text-primary">{rowCount}</span>
              </p>
            )}
          </div>

          {loading && <Progress value={progress} className="h-2" />}

          {done && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">تم الاستيراد بنجاح!</span>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={loading || !table || !file}
            className="w-full gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "جاري الاستيراد..." : "تنفيذ الاستيراد"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
