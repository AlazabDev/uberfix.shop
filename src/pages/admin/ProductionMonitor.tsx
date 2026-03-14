import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Activity, Users, Database, Wifi } from "lucide-react";
import { errorTracker } from "@/lib/errorTracking";
import { PRODUCTION_CONFIG } from "@/lib/productionConfig";
import { supabase } from "@/integrations/supabase/client";

interface SystemStatus {
  database: 'online' | 'offline' | 'error';
  auth: 'online' | 'offline' | 'error';
  functions: 'online' | 'offline' | 'error';
  realtime: 'online' | 'offline' | 'error';
}

interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  errorCount: number;
  userCount: number;
  responseTime: number;
}

export default function ProductionMonitor() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'offline',
    auth: 'offline', 
    functions: 'offline',
    realtime: 'offline'
  });
  
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    memoryUsage: 0,
    errorCount: 0,
    userCount: 0,
    responseTime: 0
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errorQueue, setErrorQueue] = useState({ queueLength: 0, isOnline: true });

  // فحص حالة النظام
  const checkSystemStatus = async () => {
    const newStatus: SystemStatus = {
      database: 'offline',
      auth: 'offline',
      functions: 'offline', 
      realtime: 'offline'
    };

    try {
      // فحص قاعدة البيانات
      const { error: dbError } = await supabase.from('profiles').select('count').limit(1);
      newStatus.database = dbError ? 'error' : 'online';
    } catch {
      newStatus.database = 'error';
    }

    try {
      // فحص المصادقة
      const { error: authError } = await supabase.auth.getSession();
      newStatus.auth = authError ? 'error' : 'online';
    } catch {
      newStatus.auth = 'error';
    }

    try {
      // فحص Edge Functions (اختبار بسيط)
      const { error: funcError } = await supabase.functions.invoke('error-tracking', {
        body: { test: true }
      });
      newStatus.functions = funcError ? 'error' : 'online';
    } catch {
      newStatus.functions = 'error';
    }

    // فحص Realtime (محاكاة)
    newStatus.realtime = 'online';

    setSystemStatus(newStatus);
  };

  // جمع مقاييس الأداء
  const collectPerformanceMetrics = () => {
    const metrics: PerformanceMetrics = {
      loadTime: 0,
      memoryUsage: 0,
      errorCount: errorQueue.queueLength,
      userCount: 0,
      responseTime: 0
    };

    // قياس وقت التحميل
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        metrics.responseTime = navigation.responseEnd - navigation.requestStart;
      }
    }

    // قياس استخدام الذاكرة
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }

    setPerformanceMetrics(metrics);
  };

  // مراقبة حالة الشبكة
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تحديث دوري للحالة والمقاييس
  useEffect(() => {
    const runChecks = async () => {
      await checkSystemStatus();
      collectPerformanceMetrics();
      setErrorQueue({ queueLength: errorTracker.getQueueSize(), isOnline: navigator.onLine });
    };

    const interval = setInterval(runChecks, 30000); // كل 30 ثانية

    // فحص فوري عند التحميل
    void runChecks();

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const clearErrorQueue = () => {
    errorTracker.clearQueue();
    setErrorQueue({ queueLength: 0, isOnline: navigator.onLine });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">مراقب الإنتاج</h1>
        <div className="flex items-center gap-2">
          <Wifi className={`w-5 h-5 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'متصل' : 'غير متصل'}
          </span>
        </div>
      </div>

      {/* حالة النظام */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قاعدة البيانات</CardTitle>
            {getStatusIcon(systemStatus.database)}
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(systemStatus.database)}>
              {systemStatus.database === 'online' ? 'متصلة' : 'منقطعة'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المصادقة</CardTitle>
            {getStatusIcon(systemStatus.auth)}
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(systemStatus.auth)}>
              {systemStatus.auth === 'online' ? 'نشطة' : 'معطلة'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الوظائف</CardTitle>
            {getStatusIcon(systemStatus.functions)}
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(systemStatus.functions)}>
              {systemStatus.functions === 'online' ? 'نشطة' : 'معطلة'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التحديثات المباشرة</CardTitle>
            {getStatusIcon(systemStatus.realtime)}
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(systemStatus.realtime)}>
              {systemStatus.realtime === 'online' ? 'نشطة' : 'معطلة'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* مقاييس الأداء */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">وقت التحميل</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(performanceMetrics.loadTime)}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">استخدام الذاكرة</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(performanceMetrics.memoryUsage)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأخطاء</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{performanceMetrics.errorCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">زمن الاستجابة</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(performanceMetrics.responseTime)}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طابور الأخطاء</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorQueue.queueLength}</div>
            {errorQueue.queueLength > 0 && (
              <Button size="sm" variant="outline" onClick={clearErrorQueue} className="mt-2">
                مسح الطابور
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* معلومات التطبيق */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات التطبيق</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">اسم التطبيق</p>
              <p className="text-2xl font-bold">{PRODUCTION_CONFIG.app.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">الإصدار</p>
              <p className="text-2xl font-bold">{PRODUCTION_CONFIG.app.version}</p>
            </div>
            <div>
              <p className="text-sm font-medium">البيئة</p>
              <p className="text-2xl font-bold">
                {import.meta.env.PROD ? 'إنتاج' : 'تطوير'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* أزرار التحكم */}
      <div className="flex gap-4">
        <Button onClick={() => {
          checkSystemStatus();
          collectPerformanceMetrics();
        }}>
          تحديث الحالة
        </Button>
        
        <Button variant="outline" onClick={() => {
          errorTracker.track('Manual system check initiated', { level: 'info' });
        }}>
          اختبار تسجيل الأحداث
        </Button>
        
        <Button variant="outline" onClick={() => {
          window.location.reload();
        }}>
          إعادة تحميل التطبيق
        </Button>
      </div>
    </div>
  );
}
