import { useState } from 'react';
import { RoleGuard } from '@/components/admin/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Lock, Settings, FileText, AlertTriangle, KeyRound } from 'lucide-react';
import { UserRolesManagement } from '@/components/admin/UserRolesManagement';
import { PermissionsManagement } from '@/components/admin/PermissionsManagement';
import { RouteAccessControl } from '@/components/admin/RouteAccessControl';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { AuditLogsViewer } from '@/components/admin/AuditLogsViewer';
import { MaintenanceLockControl } from '@/components/admin/MaintenanceLockControl';
import { ApiKeysManagement } from '@/components/admin/ApiKeysManagement';

/**
 * مركز التحكم الإداري الشامل
 * صفحة مخصصة للمديرين فقط لإدارة جميع جوانب النظام
 */
export default function AdminControlCenter() {
  const [activeTab, setActiveTab] = useState('roles');

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">مركز التحكم الإداري</h1>
          </div>
          <p className="text-muted-foreground">
            إدارة شاملة لصلاحيات المستخدمين، التوجيهات، والإعدادات العامة للنظام
          </p>
        </div>

        {/* Warning Alert */}
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">تحذير أمني</h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  أي تغييرات في هذه الصفحة تؤثر على النظام بالكامل. تأكد من فهمك الكامل قبل تعديل أي إعدادات.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-2">
            <TabsTrigger value="roles" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">أدوار المستخدمين</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">الصلاحيات</span>
            </TabsTrigger>
            <TabsTrigger value="routes" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">التوجيهات</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">قفل الصيانة</span>
            </TabsTrigger>
            <TabsTrigger value="apikeys" className="gap-2">
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">مفاتيح API</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">الإعدادات</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">سجل المراجعة</span>
            </TabsTrigger>
          </TabsList>

          {/* Roles Management */}
          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  إدارة أدوار المستخدمين
                </CardTitle>
                <CardDescription>
                  تعيين وتعديل أدوار المستخدمين في النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserRolesManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Management */}
          <TabsContent value="permissions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  إدارة الصلاحيات
                </CardTitle>
                <CardDescription>
                  تحديد صلاحيات كل دور في النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionsManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Route Access Control */}
          <TabsContent value="routes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  التحكم بالوصول للصفحات
                </CardTitle>
                <CardDescription>
                  إدارة الصفحات المتاحة لكل دور في التطبيق
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RouteAccessControl />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Lock */}
          <TabsContent value="maintenance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  التحكم بقفل الصيانة
                </CardTitle>
                <CardDescription>
                  تفعيل وإلغاء وضع الصيانة للنظام بالكامل
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceLockControl />
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="apikeys" className="mt-6">
            <ApiKeysManagement />
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  إعدادات النظام العامة
                </CardTitle>
                <CardDescription>
                  تكوين الإعدادات الأساسية للتطبيق
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SystemSettings />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs */}
          <TabsContent value="audit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  سجل المراجعة
                </CardTitle>
                <CardDescription>
                  عرض جميع العمليات الإدارية المنفذة على النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogsViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
