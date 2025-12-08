import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Edit, Search, Shield, Key, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBaseUrl } from '@/lib/utils';
import { useUserManagementPagination } from '@/hooks/useUserManagementPagination';
import { VirtualizedTable, PaginationControls } from '@/components/data-table';
import type { UserProfile } from '@/hooks/useUserManagementPagination';

const UserManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    users: filteredUsers,
    pagination,
    goToPage,
    setPageSize,
    filters,
    updateFilters,
    loading,
    fetchUsers,
    fetchUserRoles,
    getUserInstructor,
    userRoles,
  } = useUserManagementPagination(20);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const availableRoles = ['admin', 'operator', 'instructor', 'director'];
  const roleLabels: Record<string, string> = {
    admin: '관리자',
    operator: '운영',
    instructor: '강사',
    director: '조직장'
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditRoles = (user: UserProfile) => {
    setEditingUser(user);
    setSelectedRoles(userRoles[user.id] || []);
    setIsDialogOpen(true);
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, role]);
    } else {
      setSelectedRoles(prev => prev.filter(r => r !== role));
    }
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;

    try {
      // Update roles in user_roles table
      const { error } = await supabase.rpc('admin_set_user_roles_safe', {
        target_user_id: editingUser.id,
        roles: selectedRoles as unknown as ('operator' | 'instructor' | 'admin' | 'director')[]
      });

      if (error) throw error;

      // Close dialog first for better UX
      setIsDialogOpen(false);
      setEditingUser(null);

      // Refresh data to show updated roles
      await Promise.all([fetchUserRoles(), fetchUsers()]);
      
      toast({
        title: "성공",
        description: "사용자 역할이 업데이트되었습니다."
      });
    } catch (error) {
      console.error('Error updating roles:', error);
      toast({
        title: "오류",
        description: "역할 업데이트 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (user: UserProfile) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${getBaseUrl()}/change-password`
      });

      if (error) throw error;

      toast({
        title: "성공",
        description: `${user.email}에 비밀번호 재설정 이메일을 발송했습니다.`
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "오류",
        description: "비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `https://zxjiugmqfzqluviuwztr.supabase.co/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ userId: deletingUser.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '사용자 삭제에 실패했습니다.');
      }

      toast({
        title: "성공",
        description: "사용자가 삭제되었습니다."
      });

      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "오류",
        description: error.message || "사용자 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeletingUser(null);
    }
  };

  const appliedFiltersCount = filters.roleFilters.length + (filters.showFirstLoginOnly ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 검색 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이메일, 이름, 역할로 검색..."
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="grid gap-3 sm:gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={`user-skeleton-${index}`}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : !loading && filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              표시할 사용자가 없습니다.
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const instructor = getUserInstructor(user.id);
            const roles = userRoles[user.id] || [];

            return (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarImage src={instructor?.photo_url} />
                        <AvatarFallback>
                          {instructor ? instructor.name.charAt(0) : user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">
                          {instructor ? instructor.name : user.email}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                          {user.email}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {roles.length > 0 ? (
                            roles.map(role => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {roleLabels[role] || role}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              권한 없음
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                      {user.first_login && (
                        <Badge variant="outline" className="text-xs">
                          첫 로그인 대기
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(user)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Key className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">비밀번호 초기화</span>
                        <span className="sm:hidden">초기화</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRoles(user)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">권한 편집</span>
                        <span className="sm:hidden">권한</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingUser(user)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">삭제</span>
                        <span className="sm:hidden">삭제</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 페이지네이션 */}
      <PaginationControls
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        loading={loading}
      />

      {/* 역할 편집 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 역할 편집</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableRoles.map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={role}
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={(checked) => handleRoleChange(role, Boolean(checked))}
                />
                <label htmlFor={role} className="text-sm font-medium">
                  {roleLabels[role]}
                </label>
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRoles}>저장</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 <span className="font-semibold">{deletingUser?.email}</span> 사용자를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없으며, 사용자의 모든 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;