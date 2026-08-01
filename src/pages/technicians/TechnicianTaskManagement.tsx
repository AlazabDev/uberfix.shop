import React, { useState, useEffect } from "react";
import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TechnicianTask } from "@/types/technician";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  Camera, 
  FileText,
  DollarSign,
  Navigation
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function TechnicianTaskManagement() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TechnicianTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<TechnicianTask | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [workReport, setWorkReport] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // جلب technician_id الصحيح عبر technician_profiles → technicians
      const { data: profile } = await supabaseLegacy.from('technician_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        setLoading(false);
        return;
      }

      const { data: technician } = await supabaseLegacy.from('technicians')
        .select('id')
        .eq('technician_profile_id', profile.id)
        .maybeSingle();

      if (!technician) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseLegacy.from("technician_tasks")
        .select("*")
        .eq("technician_id", technician.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data as any || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (task: TechnicianTask) => {
    try {
      const { error } = await supabaseLegacy.from("technician_tasks")
        .update({
          status: "in_progress",
          check_in_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "تم تسجيل الوصول",
        description: "يمكنك الآن البدء في العمل",
      });

      fetchTasks();
      setShowCheckIn(false);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async (task: TechnicianTask) => {
    if (!workReport.trim()) {
      toast({
        title: "خطأ",
        description: "يجب كتابة تقرير العمل",
        variant: "destructive",
      });
      return;
    }

    try {
      const checkInTime = new Date(task.check_in_at!);
      const checkOutTime = new Date();
      const duration = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

      const { error } = await supabaseLegacy.from("technician_tasks")
        .update({
          status: "completed",
          check_out_at: checkOutTime.toISOString(),
          work_report: workReport,
          actual_duration: duration,
        })
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "تم إنهاء المهمة",
        description: "شكراً لك! تم تسجيل عملك بنجاح",
      });

      fetchTasks();
      setShowCheckOut(false);
      setWorkReport("");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: "قيد الانتظار", className: "bg-yellow-600" },
      accepted: { label: "تم القبول", className: "bg-blue-600" },
      in_progress: { label: "جاري العمل", className: "bg-purple-600" },
      completed: { label: "مكتمل", className: "bg-green-600" },
      cancelled: { label: "ملغي", className: "bg-red-600" },
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">إدارة المهام</h1>
          <p className="text-muted-foreground">جميع المهام المخصصة لك</p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active">النشطة</TabsTrigger>
            <TabsTrigger value="pending">المعلقة</TabsTrigger>
            <TabsTrigger value="completed">المكتملة</TabsTrigger>
            <TabsTrigger value="all">الكل</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {tasks.filter(t => t.status === 'in_progress' || t.status === 'accepted').map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onCheckIn={() => {
                  setSelectedTask(task);
                  setShowCheckIn(true);
                }}
                onCheckOut={() => {
                  setSelectedTask(task);
                  setShowCheckOut(true);
                }}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {tasks.filter(t => t.status === 'pending').map((task) => (
              <TaskCard key={task.id} task={task} getStatusBadge={getStatusBadge} />
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {tasks.filter(t => t.status === 'completed').map((task) => (
              <TaskCard key={task.id} task={task} getStatusBadge={getStatusBadge} />
            ))}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} getStatusBadge={getStatusBadge} />
            ))}
          </TabsContent>
        </Tabs>

        {/* Check In Dialog */}
        <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تسجيل الوصول</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>هل وصلت إلى موقع العمل وجاهز للبدء؟</p>
              <div className="flex gap-4">
                <Button onClick={() => selectedTask && handleCheckIn(selectedTask)} className="flex-1">
                  نعم، ابدأ العمل
                </Button>
                <Button variant="outline" onClick={() => setShowCheckIn(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Check Out Dialog */}
        <Dialog open={showCheckOut} onOpenChange={setShowCheckOut}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنهاء المهمة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>تقرير العمل *</Label>
                <Textarea
                  value={workReport}
                  onChange={(e) => setWorkReport(e.target.value)}
                  placeholder="اكتب ملخص للعمل المنجز..."
                  rows={5}
                />
              </div>
              <Button
                onClick={() => selectedTask && handleCheckOut(selectedTask)}
                className="w-full"
              >
                إنهاء المهمة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: TechnicianTask;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

function TaskCard({ task, onCheckIn, onCheckOut, getStatusBadge }: TaskCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-xl">{task.task_title}</CardTitle>
              {getStatusBadge(task.status)}
            </div>
            <CardDescription>{task.task_description}</CardDescription>
          </div>
          {task.estimated_price && (
            <div className="text-left">
              <div className="text-2xl font-bold text-primary">{task.estimated_price} جنيه</div>
              <div className="text-xs text-muted-foreground">السعر التقديري</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {task.customer_location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{task.customer_location}</span>
            </div>
          )}
          {task.estimated_duration && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{task.estimated_duration} دقيقة تقريباً</span>
            </div>
          )}
          {task.created_at && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(task.created_at), "dd MMM yyyy", { locale: ar })}</span>
            </div>
          )}
        </div>

        {task.status === 'accepted' && onCheckIn && (
          <Button onClick={onCheckIn} className="w-full">
            <Navigation className="ml-2 h-4 w-4" />
            تسجيل الوصول
          </Button>
        )}

        {task.status === 'in_progress' && onCheckOut && (
          <Button onClick={onCheckOut} className="w-full bg-green-600 hover:bg-green-700">
            <CheckCircle className="ml-2 h-4 w-4" />
            إنهاء المهمة
          </Button>
        )}

        {task.work_report && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">تقرير العمل:</h4>
            <p className="text-sm text-muted-foreground">{task.work_report}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
