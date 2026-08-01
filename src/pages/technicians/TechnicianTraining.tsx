import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, PlayCircle, CheckCircle, Lock, Award } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string;
  requiredScore: number;
  order: number;
}

const TRAINING_COURSES: Course[] = [
  {
    id: "course-1",
    title: "استقبال الطلب والتواصل مع العميل",
    description: "تعلم كيفية استقبال الطلبات والتواصل الفعال مع العملاء",
    duration: "15 دقيقة",
    requiredScore: 80,
    order: 1,
  },
  {
    id: "course-2",
    title: "التقاط الصور قبل وبعد العمل",
    description: "كيفية توثيق العمل بصور احترافية",
    duration: "10 دقائق",
    requiredScore: 80,
    order: 2,
  },
  {
    id: "course-3",
    title: "إغلاق المهمة وكتابة التقارير",
    description: "خطوات إنهاء المهمة وكتابة تقرير مفصل",
    duration: "12 دقيقة",
    requiredScore: 80,
    order: 3,
  },
  {
    id: "course-4",
    title: "احترام وقت العميل والخصوصية",
    description: "قواعد السلوك المهني داخل منازل العملاء",
    duration: "20 دقيقة",
    requiredScore: 90,
    order: 4,
  },
  {
    id: "course-5",
    title: "التعامل مع المشاكل والطوارئ",
    description: "كيفية التصرف عند مواجهة مشكلات غير متوقعة",
    duration: "18 دقيقة",
    requiredScore: 85,
    order: 5,
  },
];

export default function TechnicianTraining() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if technician record exists
      const { data: tech } = await supabaseLegacy.from("technicians")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!tech) {
        toast({
          title: "خطأ",
          description: "يجب إكمال التسجيل والتحقق أولاً",
          variant: "destructive",
        });
        navigate("/technicians/register");
        return;
      }

      setTechnicianId(tech.id);

      // Load completed courses
      const { data: training } = await supabaseLegacy.from("technician_training")
        .select("course_type, status")
        .eq("technician_id", tech.id)
        .eq("status", "completed");

      setCompletedCourses(training?.map(t => t.course_type) || []);
    } catch (error) {
      console.error("Error checking eligibility:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = (course: Course) => {
    setCurrentCourse(course);
  };

  const handleCompleteCourse = async (course: Course) => {
    if (!technicianId) return;

    try {
      const { error } = await supabaseLegacy.from("technician_training")
        .insert({
          technician_id: technicianId,
          course_type: course.id,
          course_title: course.title,
          status: "completed",
          progress: 100,
          score: 100, // Mock score
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      setCompletedCourses([...completedCourses, course.id]);
      setCurrentCourse(null);

      toast({
        title: "أحسنت!",
        description: `أكملت دورة: ${course.title}`,
      });

      // Check if all courses completed
      if (completedCourses.length + 1 === TRAINING_COURSES.length) {
        toast({
          title: "تهانينا! 🎉",
          description: "أكملت جميع الدورات التدريبية وأصبحت فني معتمد من UberFix",
        });
        
        // Award certified badge
        await supabaseLegacy.from("technician_badges")
          .insert({
            technician_id: technicianId,
            badge_type: "legacy",
            badge_title: "UberFix Certified",
            badge_description: "فني معتمد - اجتاز جميع الدورات التدريبية",
            awarded_at: new Date().toISOString(),
          });

        setTimeout(() => {
          navigate("/technicians/dashboard");
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const overallProgress = (completedCourses.length / TRAINING_COURSES.length) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Card className="mb-8 border-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">التدريب الأساسي</CardTitle>
                <CardDescription className="text-white/80 text-lg">
                  أكمل جميع الدورات لتصبح فني معتمد
                </CardDescription>
              </div>
              <GraduationCap className="w-16 h-16" />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">التقدم الكلي</span>
                <span className="text-sm font-bold">{completedCourses.length} / {TRAINING_COURSES.length}</span>
              </div>
              <Progress value={overallProgress} className="h-3 bg-white/20" />
            </div>
          </CardHeader>
        </Card>

        {/* Courses Grid */}
        <div className="space-y-4">
          {TRAINING_COURSES.map((course, index) => {
            const isCompleted = completedCourses.includes(course.id);
            const isLocked = index > 0 && !completedCourses.includes(TRAINING_COURSES[index - 1].id);

            return (
              <Card key={course.id} className={`border-2 ${isCompleted ? 'border-green-600' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-600' : isLocked ? 'bg-gray-400' : 'bg-primary'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-white" />
                          ) : isLocked ? (
                            <Lock className="w-6 h-6 text-white" />
                          ) : (
                            <span className="text-white font-bold">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{course.title}</h3>
                          <p className="text-sm text-muted-foreground">{course.duration}</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4">{course.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">نتيجة النجاح: {course.requiredScore}%</Badge>
                        {isCompleted && (
                          <Badge className="bg-green-600">
                            <Award className="w-3 h-3 ml-1" />
                            مكتمل
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      {isCompleted ? (
                        <Button variant="outline" disabled>
                          <CheckCircle className="ml-2 h-4 w-4" />
                          مكتمل
                        </Button>
                      ) : isLocked ? (
                        <Button variant="outline" disabled>
                          <Lock className="ml-2 h-4 w-4" />
                          مغلق
                        </Button>
                      ) : currentCourse?.id === course.id ? (
                        <Button onClick={() => handleCompleteCourse(course)} size="lg">
                          إنهاء الدورة
                        </Button>
                      ) : (
                        <Button onClick={() => handleStartCourse(course)} size="lg">
                          <PlayCircle className="ml-2 h-5 w-5" />
                          ابدأ الآن
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Certification Card */}
        {completedCourses.length === TRAINING_COURSES.length && (
          <Card className="mt-8 border-4 border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
            <CardContent className="p-8 text-center">
              <Award className="w-20 h-20 mx-auto mb-4 text-yellow-600" />
              <h2 className="text-3xl font-bold mb-2">تهانينا! 🎉</h2>
              <p className="text-xl text-muted-foreground mb-4">
                أصبحت الآن <span className="font-bold text-yellow-600">فني معتمد من UberFix</span>
              </p>
              <Badge className="text-lg px-6 py-2 bg-yellow-600">
                UberFix Certified Technician
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
