import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Conversation {
  id: string;
  status: string | null;
  sender_name: string | null;
  assigned_to: string | null;
  last_message_at: string | null;
  created_at: string;
  contact_id: string | null;
}

function formatAgo(iso: string | null): { label: string; days: number; tone: "fresh" | "soon" | "warn" | "danger" } {
  if (!iso) return { label: "لا توجد رسائل", days: -1, tone: "fresh" };
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  let label: string;
  if (mins < 1) label = "Just now";
  else if (mins < 60) label = `${mins} min ago`;
  else if (hours < 24) label = `${hours} hour${hours === 1 ? "" : "s"} ago`;
  else label = `${days} day${days === 1 ? "" : "s"} ago`;

  let tone: "fresh" | "soon" | "warn" | "danger" = "fresh";
  if (days >= 6) tone = "danger";
  else if (days >= 3) tone = "warn";
  else if (hours >= 24) tone = "soon";
  return { label, days, tone };
}

const toneClass: Record<string, string> = {
  fresh: "bg-emerald-100 text-emerald-700 border-emerald-200",
  soon: "bg-amber-100 text-amber-700 border-amber-200",
  warn: "bg-orange-100 text-orange-700 border-orange-200",
  danger: "bg-red-100 text-red-700 border-red-200",
};

export default function WaHub() {
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["wa-hub-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_conversations")
        .select("id, status, sender_name, assigned_to, last_message_at, created_at, contact_id")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  const ids = useMemo(() => conversations?.map((c) => c.id) ?? [], [conversations]);

  const { data: lastInbound } = useQuery<Record<string, string>>({
    queryKey: ["wa-hub-last-inbound", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_messages")
        .select("conversation_id, created_at")
        .in("conversation_id", ids)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        const cid = (row as any).conversation_id as string;
        if (cid && !map[cid]) map[cid] = (row as any).created_at as string;
      }
      return map;
    },
  });

  return (
    <div className="container mx-auto py-8 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Hub — صندوق المحادثات</h1>
          <p className="text-sm text-muted-foreground">
            عرض المحادثات مع زمن آخر رسالة من العميل (Human Agent window: 7 days).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> المحادثات النشطة ({conversations?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </>
          )}

          {!isLoading && (conversations?.length ?? 0) === 0 && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
              <AlertCircle className="h-4 w-4" /> لا توجد محادثات حالياً.
            </div>
          )}

          {conversations?.map((c) => {
            const inboundAt = lastInbound?.[c.id] ?? c.last_message_at;
            const ago = formatAgo(inboundAt);
            const name = c.sender_name?.trim() || "عميل";
            const initial = (name[0] || "?").toUpperCase();
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="capitalize">{c.status || "open"}</span>
                      {c.assigned_to ? (
                        <Badge variant="outline" className="text-[10px]">Assigned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Unassigned</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${toneClass[ago.tone]}`}
                  title={inboundAt ? new Date(inboundAt).toLocaleString() : ""}
                  dir="ltr"
                >
                  Last customer message: {ago.label}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}