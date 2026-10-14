import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable, type ColumnDef } from "@/components/admin/AdminDataTable";
import { Plus, Play, CalendarClock, Pencil, Pause, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Link } from "react-router-dom";

type Plan = Database["public"]["Tables"]["preventive_plans"]["Row"];
const frequencies: Record<string, string> = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري", yearly: "سنوي" };
const planSchema = z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(2000), property_id: z.string().uuid(), service_id: z.string(), contract_id: z.string(), client_name: z.string().trim().min(1).max(100), client_phone: z.string().regex(/^\+?[0-9]{8,15}$/, "رقم العميل يجب أن يحتوي على 8 إلى 15 رقمًا"), frequency: z.enum(["daily", "weekly", "monthly", "yearly"]), interval_count: z.coerce.number().int().min(1).max(365), start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), priority: z.enum(["low", "medium", "high"]), service_type: z.string().min(1) });
const blank = () => ({ title: "", description: "", property_id: "", service_id: "none", contract_id: "none", client_name: "", client_phone: "", frequency: "monthly", interval_count: 1, start_date: new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }), priority: "medium", service_type: "general" });
export default function PreventivePlans() {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState("");
  const plans = useQuery({ queryKey: ["preventive-plans"], queryFn: async () => { const { data, error } = await supabase.from("preventive_plans").select("*").order("next_due_date").limit(1000); if (error) throw error; return data; } });
  const options = useQuery({ queryKey: ["preventive-options"], queryFn: async () => {
    const [p, s, c] = await Promise.all([supabase.from("properties").select("id,name").limit(1000), supabase.from("services").select("id,name").eq("is_active", true).limit(1000), supabase.from("maintenance_contracts").select("id,title").limit(1000)]);
    if (p.error || s.error || c.error) throw p.error || s.error || c.error;
    return { properties: p.data || [], services: s.data || [], contracts: c.data || [] };
  } });
  const runs = useQuery({ queryKey: ["preventive-runs"], queryFn: async () => { const { data, error } = await supabase.from("preventive_plan_runs").select("*").order("created_at", { ascending: false }).limit(500); if (error) throw error; return data; } });
  const refresh = () => { void cache.invalidateQueries({ queryKey: ["preventive-plans"] }); void cache.invalidateQueries({ queryKey: ["preventive-runs"] }); };
  const edit = (p?: Plan) => { setEditing(p || null); setForm(p ? { title: p.title, description: p.description, property_id: p.property_id, service_id: p.service_id || "none", contract_id: p.contract_id || "none", client_name: p.client_name, client_phone: p.client_phone, frequency: p.frequency, interval_count: p.interval_count, start_date: p.start_date, priority: p.priority, service_type: p.service_type } : blank()); setOpen(true); };
  const save = async () => {
    const valid = planSchema.safeParse(form);
    if (!valid.success) { toast.error(valid.error.issues[0]?.message || "تحقق من البيانات"); return; }
    setBusy(true);
    try {
      const { data: company, error: companyError } = await supabase.rpc("get_current_user_company_id");
      if (companyError || !company) throw new Error("الحساب غير مرتبط بشركة");
      const value = { ...valid.data, company_id: company, service_id: form.service_id === "none" ? null : form.service_id, contract_id: form.contract_id === "none" ? null : form.contract_id, next_due_date: editing?.start_date === form.start_date ? editing.next_due_date : form.start_date };
      const result = editing ? await supabase.from("preventive_plans").update(value).eq("id", editing.id).select("id").single() : await supabase.from("preventive_plans").insert(value).select("id").single();
      if (result.error) throw result.error;
      toast.success("تم حفظ الخطة"); setOpen(false); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "تعذر حفظ الخطة"); } finally { setBusy(false); }
  };
  const generate = async () => {
    setBusy(true); setRunResult(""); let ok = 0; let failed = 0;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
    for (const p of (plans.data || []).filter(p => p.is_active && p.next_due_date <= today)) {
      try {
        const { data: run, error } = await supabase.rpc("claim_preventive_run", { p_plan_id: p.id });
        if (error || !run) throw error || new Error("تعذر حجز الاستحقاق");
        const { data, error: gatewayError } = await supabase.functions.invoke("gateway", { body: { channel: "internal", action: "create_request", preventive_run_id: run.id, property_id: p.property_id, client_name: p.client_name, client_phone: p.client_phone, service_type: p.service_type, priority: p.priority, description: p.description || p.title, source_metadata: { preventive_plan_id: p.id, due_date: p.next_due_date } } });
        if (gatewayError || !data?.success) throw gatewayError || new Error(data?.message_ar || "تعذر التوليد");
        ok++;
      } catch (e) { failed++; toast.error(`${p.title}: ${e instanceof Error ? e.message : "تعذر التوليد"}`); }
    }
    setRunResult(`طلبات تم توليدها: ${ok} — تعذر توليد: ${failed}`); refresh(); setBusy(false);
  };
  const columns: ColumnDef<Plan>[] = [
    { key: "title", header: "الخطة", sortable: true, render: p => <span className="font-semibold">{p.title}</span> },
    { key: "property_id", header: "العقار", render: p => options.data?.properties.find(v => v.id === p.property_id)?.name || "—" },
    { key: "service_id", header: "الخدمة", render: p => options.data?.services.find(v => v.id === p.service_id)?.name || "صيانة عامة" },
    { key: "frequency", header: "التكرار", render: p => `${frequencies[p.frequency]} · ${p.interval_count}` },
    { key: "next_due_date", header: "الاستحقاق التالي", sortable: true },
    { key: "is_active", header: "الحالة", render: p => <Badge variant="outline" className={p.is_active ? "text-success" : "text-muted-foreground"}>{p.is_active ? "نشطة" : "موقوفة"}</Badge> },
    { key: "actions", header: "الإجراءات", render: p => <div className="flex gap-1"><Button variant="ghost" size="icon" title="تعديل الخطة" aria-label="تعديل الخطة" onClick={() => edit(p)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={busy} title={p.is_active ? "إيقاف الخطة" : "تفعيل الخطة"} aria-label={p.is_active ? "إيقاف الخطة" : "تفعيل الخطة"} onClick={async () => { const { error } = await supabase.from("preventive_plans").update({ is_active: !p.is_active }).eq("id", p.id).select("id").single(); if (error) toast.error("تعذر تغيير الحالة"); else refresh(); }}>{p.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button></div> },
  ];
  return <div className="p-4 sm:p-6 space-y-4">
    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" size="icon" title="تحديث الخطط" aria-label="تحديث الخطط" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button><Button variant="outline" disabled={busy || plans.isLoading || !!plans.error} onClick={generate} className="gap-2"><Play className="h-4 w-4" />تشغيل التوليد لليوم</Button><Button onClick={() => edit()} className="gap-2"><Plus className="h-4 w-4" />إنشاء خطة</Button></div>
    {(plans.error || options.error || runs.error) && <p role="alert" className="text-destructive">تعذر تحميل بيانات الخطط. أعد المحاولة.</p>}
    {runResult && <p role="status" className="text-sm border-s-4 border-s-success ps-3">{runResult}</p>}
    <Tabs defaultValue="plans"><TabsList><TabsTrigger value="plans">الخطط</TabsTrigger><TabsTrigger value="activity">نشاط التوليد</TabsTrigger></TabsList>
      <TabsContent value="plans"><AdminDataTable title="خطط الصيانة الوقائية" icon={<CalendarClock className="h-5 w-5" />} data={plans.data || []} columns={columns} isLoading={plans.isLoading} searchKeys={["title", "client_name"]} filters={[
        { key: "frequency", label: "التكرار", options: Object.entries(frequencies).map(([value,label]) => ({value,label})) },
        { key: "is_active", label: "الحالة", options: [{value:"true",label:"نشطة"},{value:"false",label:"موقوفة"}] },
        { key: "property_id", label: "العقار", options: (options.data?.properties || []).map(p => ({value:p.id,label:p.name})) },
        { key: "priority", label: "الأولوية", options: [{value:"low",label:"منخفضة"},{value:"medium",label:"متوسطة"},{value:"high",label:"عالية"}] },
      ]} /></TabsContent>
      <TabsContent value="activity"><AdminDataTable title="نشاط التوليد" data={runs.data || []} isLoading={runs.isLoading} columns={[
        {key:"plan_id",header:"الخطة",render:r => plans.data?.find(p=>p.id===r.plan_id)?.title || "—"}, {key:"due_date",header:"الاستحقاق",sortable:true}, {key:"status",header:"النتيجة",render:r => r.status === "success" ? "تم التوليد" : "لم يكتمل — قابل لإعادة المحاولة"}, {key:"request_id",header:"الطلب",render:r => r.request_id ? <Link className="text-primary underline" to={`/requests/${r.request_id}`}>عرض الطلب</Link> : "—"}, {key:"created_at",header:"وقت التشغيل",render:r=>new Date(r.created_at).toLocaleString("ar-EG")},
      ]} /></TabsContent>
    </Tabs>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "تعديل الخطة" : "إنشاء خطة صيانة وقائية"}</DialogTitle></DialogHeader><form onSubmit={e => {e.preventDefault(); void save();}} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {([['title','اسم الخطة'],['client_name','اسم العميل'],['client_phone','هاتف العميل'],['start_date','تاريخ البداية'],['interval_count','كل عدد من الفترات'],['description','الوصف']] as const).map(([key,label]) => <div key={key} className={key === "description" ? "sm:col-span-2 space-y-1" : "space-y-1"}><Label htmlFor={`plan-${key}`}>{label}</Label><Input id={`plan-${key}`} required={key !== "description"} maxLength={key === "description" ? 2000 : 200} type={key === "start_date" ? "date" : key === "interval_count" ? "number" : "text"} min={key === "interval_count" ? 1 : undefined} max={key === "interval_count" ? 365 : undefined} value={form[key]} onChange={e=>setForm({...form,[key]: key === "interval_count" ? Number(e.target.value) : e.target.value})} /></div>)}
      {([
        ["property_id","العقار",(options.data?.properties || []).map(p=>({value:p.id,label:p.name}))],
        ["service_id","الخدمة",[{value:"none",label:"صيانة عامة"},...(options.data?.services || []).map(s=>({value:s.id,label:s.name}))]],
        ["contract_id","العقد",[{value:"none",label:"بدون عقد"},...(options.data?.contracts || []).map(c=>({value:c.id,label:c.title}))]],
        ["frequency","التكرار",Object.entries(frequencies).map(([value,label])=>({value,label}))],
        ["priority","الأولوية",[{value:"low",label:"منخفضة"},{value:"medium",label:"متوسطة"},{value:"high",label:"عالية"}]],
      ] as const).map(([key,label,values])=><div key={key} className="space-y-1"><Label>{label}</Label><Select value={form[key]} onValueChange={v=>setForm({...form,[key]:v})}><SelectTrigger aria-label={label}><SelectValue placeholder={label} /></SelectTrigger><SelectContent>{values.map(v=><SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent></Select></div>)}
      <div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>إلغاء</Button><Button type="submit" disabled={busy || options.isLoading}>حفظ الخطة</Button></div>
    </form></DialogContent></Dialog>
  </div>;
}