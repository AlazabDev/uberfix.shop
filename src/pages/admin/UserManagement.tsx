import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield, Trash2, Search } from "lucide-react";

interface User {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
}

type AppRole = 'admin' | 'manager' | 'staff' | 'technician' | 'vendor' | 'customer' | 'dispatcher' | 'finance';

const roleLabels: Record<AppRole, string> = {
  admin: 'مدير',
  manager: 'مدير قسم',
  staff: 'موظف',
  technician: 'فني',
  vendor: 'مقاول',
  customer: 'عميل',
  dispatcher: 'موزع',
  finance: 'محاسب'
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-500',
  manager: 'bg-purple-500',
  staff: 'bg-blue-500',
  technician: 'bg-green-500',
  vendor: 'bg-yellow-500',
  customer: 'bg-gray-500',
  dispatcher: 'bg-orange-500',
  finance: 'bg-cyan-500'
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('customer');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await checkAdminAccess();
      if (ok) fetchUsers();
    })();
  }, []);

  const checkAdminAccess = async (): Promise<boolean> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      window.location.href = '/auth/login';
      return false;
    }
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      toast.error('ليس لديك صلاحية للوصول إلى هذه الصفحة');
      window.location.href = '/';
      return false;
    }
    return true;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Use Edge Function to list users (requires admin role)
      const { data, error } = await supabase.functions.invoke('admin-list-users');
      
      if (error) {
        console.error('Error fetching users:', error);
        if (error.message?.includes('Forbidden') || error.message?.includes('403')) {
          toast.error('ليس لديك صلاحية للوصول إلى هذه الصفحة');
          window.location.href = '/';
          return;
        }
        throw error;
      }

      if (!data?.users) {
        setUsers([]);
        return;
      }

      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async () => {
    if (!selectedUser) return;

    setIsAssigning(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: selectedUser.id,
          role: selectedRole as any,
          assigned_by: currentUser.user?.id
        }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('هذا المستخدم لديه هذا الدور بالفعل');
        } else {
          throw error;
        }
      } else {
        toast.success('تم تعيين الدور بنجاح');
        fetchUsers();
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('فشل تعيين الدور');
    } finally {
      setIsAssigning(false);
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      toast.success('تم إزالة الدور بنجاح');
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('فشل إزالة الدور');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">إدارة المستخدمين والأدوار</h1>
        <p className="text-muted-foreground">إدارة مستخدمي النظام وتعيين الأدوار والصلاحيات</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>المستخدمين ({filteredUsers.length})</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالبريد الإلكتروني..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 w-64"
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الأدوار</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <div key={role} className="flex items-center gap-1">
                            <Badge className={`${roleColors[role as AppRole]} text-primary-foreground`}>
                              {roleLabels[role as AppRole]}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => removeRole(user.id, role as AppRole)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">لا يوجد أدوار</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('ar-EG')}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Shield className="ml-2 h-4 w-4" />
                          تعيين دور
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>تعيين دور جديد</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>المستخدم</Label>
                            <Input value={user.email} disabled />
                          </div>
                          <div>
                            <Label>الدور</Label>
                            <Select
                              value={selectedRole}
                              onValueChange={(value) => setSelectedRole(value as AppRole)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(roleLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={assignRole}
                            disabled={isAssigning}
                            className="w-full"
                          >
                            {isAssigning ? (
                              <>
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                جاري التعيين...
                              </>
                            ) : (
                              <>
                                <UserPlus className="ml-2 h-4 w-4" />
                                تعيين الدور
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* بطاقة توضيحية للأدوار */}
      <Card>
        <CardHeader>
          <CardTitle>الأدوار والصلاحيات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge className={`${roleColors[role as AppRole]} text-primary-foreground mt-1`}>
                  {label}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {role === 'admin' && 'جميع الصلاحيات في النظام'}
                  {role === 'manager' && 'إدارة الطلبات والعقارات والموافقات'}
                  {role === 'staff' && 'إنشاء وتعديل الطلبات والعقارات'}
                  {role === 'technician' && 'تنفيذ طلبات الصيانة المخصصة'}
                  {role === 'vendor' && 'استلام وتنفيذ طلبات الصيانة'}
                  {role === 'customer' && 'إنشاء طلبات صيانة وعرض العقارات'}
                  {role === 'dispatcher' && 'توزيع الطلبات على الفنيين'}
                  {role === 'finance' && 'إدارة الفواتير والتقارير المالية'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
