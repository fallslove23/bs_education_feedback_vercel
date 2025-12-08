import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Calendar, Search, Filter, AlertCircle, CheckCircle, XCircle, Info, Menu, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// 변경 전: import { AdminLayout } from "@/components/layouts/AdminLayout";



interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  details?: any;
  user_id?: string;
  metadata?: any;
}

const SystemLogs = () => {
  const { userRoles } = useAuth();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const canViewLogs = userRoles.includes('admin') || userRoles.includes('operator');

  const fetchSystemLogs = async () => {
    try {
      setLoading(true);
      
      // 시스템 로그 데이터 (임시 데이터 - 실제로는 Supabase analytics에서 가져와야 함)
      const mockLogs: SystemLog[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          category: 'auth',
          message: '사용자 로그인',
          details: { user_email: 'admin@example.com' },
          user_id: 'user1'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          level: 'warning',
          category: 'survey',
          message: '설문 생성 실패 시도',
          details: { reason: 'Invalid template ID' },
          user_id: 'user2'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          level: 'error',
          category: 'database',
          message: 'RLS 정책 위반',
          details: { table: 'surveys', operation: 'INSERT' },
          user_id: 'user3'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          level: 'success',
          category: 'email',
          message: '설문 결과 이메일 발송 완료',
          details: { recipients: 15, survey_id: 'survey_123' },
          user_id: 'user4'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          level: 'info',
          category: 'system',
          message: '시스템 백업 완료',
          details: { backup_size: '2.3GB', duration: '45s' },
          user_id: 'system'
        }
      ];

      setLogs(mockLogs);
    } catch (error) {
      console.error('시스템 로그 조회 오류:', error);
      toast.error('시스템 로그를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewLogs) {
      fetchSystemLogs();
    }
  }, [canViewLogs]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    
    return matchesSearch && matchesLevel && matchesCategory;
  });

  const getLevelBadge = (level: string) => {
    const variants = {
      info: { variant: "secondary" as const, icon: Info, color: "text-blue-600" },
      success: { variant: "secondary" as const, icon: CheckCircle, color: "text-green-600" },
      warning: { variant: "destructive" as const, icon: AlertCircle, color: "text-orange-600" },
      error: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" }
    };

    const config = variants[level as keyof typeof variants] || variants.info;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {level.toUpperCase()}
      </Badge>
    );
  };

  const categories = [...new Set(logs.map(log => log.category))];

  const stats = {
    total: logs.length,
    error: logs.filter(log => log.level === 'error').length,
    warning: logs.filter(log => log.level === 'warning').length,
    info: logs.filter(log => log.level === 'info').length,
    success: logs.filter(log => log.level === 'success').length
  };

  // 데스크톱 액션 버튼들
  const DesktopActions = () => (
    <Button onClick={fetchSystemLogs} disabled={loading}>
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      새로고침
    </Button>
  );

  // 모바일 액션 버튼들  
  const MobileActions = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>시스템 로그 메뉴</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <Button 
            className="w-full justify-start" 
            onClick={fetchSystemLogs} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          
          <div className="space-y-3 text-sm">
            <div className="font-medium">로그 요약</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  전체 로그
                </span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  오류
                </span>
                <span className="font-medium text-red-600">{stats.error}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  경고
                </span>
                <span className="font-medium text-orange-600">{stats.warning}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  정보
                </span>
                <span className="font-medium text-blue-600">{stats.info}</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  if (!canViewLogs) {
    return (
      <div className="flex items-center justify-center py-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">접근 권한 없음</h3>
            <p className="text-muted-foreground">시스템 로그를 조회할 권한이 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 액션 버튼들 */}
      <div className="flex justify-end gap-2 mb-4">
        <DesktopActions />
      </div>
      <div className="space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                전체 로그
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                오류
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.error}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                경고
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.warning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.info}</div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              필터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="메시지 또는 카테고리 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="레벨 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 레벨</SelectItem>
                  <SelectItem value="info">정보</SelectItem>
                  <SelectItem value="warning">경고</SelectItem>
                  <SelectItem value="error">오류</SelectItem>
                  <SelectItem value="success">성공</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 카테고리</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 로그 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>시스템 로그 ({filteredLogs.length})</CardTitle>
            <CardDescription>최근 시스템 활동 및 오류 로그</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>레벨</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>메시지</TableHead>
                    <TableHead>상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        {getLevelBadge(log.level)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.category}</Badge>
                      </TableCell>
                      <TableCell>{log.message}</TableCell>
                      <TableCell>
                        {log.details && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                상세보기
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>로그 상세 정보</DialogTitle>
                                <DialogDescription>
                                  {new Date(log.timestamp).toLocaleString('ko-KR')}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">레벨:</span>
                                    <div>{getLevelBadge(log.level)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">카테고리:</span>
                                    <div><Badge variant="outline">{log.category}</Badge></div>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">메시지:</span>
                                    <div>{log.message}</div>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-sm">상세 정보:</span>
                                  <ScrollArea className="max-h-96 mt-2">
                                    <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        조건에 맞는 로그가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemLogs;
