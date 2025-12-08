import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, Legend } from 'recharts';
import { Mail, CheckCircle, XCircle, Clock, Calendar as CalendarIcon, Filter, TrendingUp, RefreshCw, Eye, Menu, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';


interface EmailLog {
  id: string;
  survey_id: string;
  recipients: string[];
  status: string;
  sent_count: number;
  failed_count: number;
  results: any;
  error: string;
  created_at: string;
}

interface Survey {
  id: string;
  title: string;
  education_year: number;
  education_round: number;
}

const EmailLogs = () => {
  const { userRoles } = useAuth();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const { toast } = useToast();

  const isAdmin = userRoles.includes('admin');
  const isOperator = userRoles.includes('operator');
  const isDirector = userRoles.includes('director');
  const canViewLogs = isAdmin || isOperator || isDirector;

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

  useEffect(() => {
    if (canViewLogs) {
      fetchEmailLogs();
      fetchSurveys();
    }
  }, [canViewLogs]);

  const fetchEmailLogs = async () => {
    try {
      setLoading(true);

      // 실제 이메일 로그를 DB에서 조회 (RLS: admin/operator/director만 허용)
      const { data, error } = await supabase.rpc('get_email_logs');
      if (error) throw error;

      const rows = (data || []) as any[];
      const normalized: EmailLog[] = rows.map((row) => ({
        id: row.id,
        survey_id: row.survey_id,
        recipients: Array.isArray(row.recipients) ? (row.recipients as string[]) : [],
        status: row.status,
        sent_count: row.sent_count ?? 0,
        failed_count: row.failed_count ?? 0,
        results: row.results ?? null,
        error: row.error ?? '',
        created_at: row.created_at,
      }));

      setLogs(normalized);
    } catch (error) {
      console.error('Error fetching email logs:', error);
      toast({
        title: '오류',
        description: '이메일 로그를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, education_year, education_round')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error('Error fetching surveys:', error);
    }
  };

  const getFilteredLogs = () => {
    let filtered = logs;

    if (selectedSurvey && selectedSurvey !== 'all') {
      filtered = filtered.filter(log => log.survey_id === selectedSurvey);
    }

    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(log => log.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.recipients.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (dateRange) {
      const monthStart = startOfMonth(dateRange);
      const monthEnd = endOfMonth(dateRange);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= monthStart && logDate <= monthEnd;
      });
    }

    return filtered;
  };

  const getStatusStats = () => {
    const filtered = getFilteredLogs();
    const total = filtered.length;
    const success = filtered.filter(log => log.status === 'success').length;
    const failed = filtered.filter(log => log.status === 'failed').length;
    const partial = filtered.filter(log => log.status === 'partial').length;

    return [
      { name: '성공', value: success, color: '#10b981' },
      { name: '실패', value: failed, color: '#ef4444' },
      { name: '부분성공', value: partial, color: '#f59e0b' }
    ];
  };

  const getMonthlyStats = () => {
    const monthlyData: Record<string, { sent: number; failed: number; total: number }> = {};
    
    // 최근 6개월 데이터 초기화
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      monthlyData[key] = { sent: 0, failed: 0, total: 0 };
    }

    logs.forEach(log => {
      const date = new Date(log.created_at);
      const key = format(date, 'yyyy-MM');
      if (monthlyData[key]) {
        monthlyData[key].sent += log.sent_count;
        monthlyData[key].failed += log.failed_count;
        monthlyData[key].total += 1;
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month: format(new Date(month + '-01'), 'MM월', { locale: ko }),
      ...data
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />성공</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />실패</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />부분성공</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSurveyTitle = (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    return survey ? `${survey.title} (${survey.education_year}년 ${survey.education_round}차)` : '설문 정보 없음';
  };

  const totalStats = {
    totalLogs: logs.length,
    totalSent: logs.reduce((sum, log) => sum + log.sent_count, 0),
    totalFailed: logs.reduce((sum, log) => sum + log.failed_count, 0),
    successRate: logs.length > 0 
      ? Math.round((logs.filter(log => log.status === 'success').length / logs.length) * 100) 
      : 0
  };

  // 데스크톱 액션 버튼들
  const DesktopActions = () => (
    <Button onClick={fetchEmailLogs} disabled={loading}>
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
          <SheetTitle>이메일 로그 메뉴</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <Button 
            className="w-full justify-start" 
            onClick={fetchEmailLogs} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>총 {totalStats.totalLogs}건의 발송 기록</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>성공률 {totalStats.successRate}%</span>
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
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">접근 권한 없음</h3>
            <p className="text-muted-foreground">이메일 로그를 조회할 권한이 없습니다.</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-blue-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">총 발송 기록</p>
                  <div className="text-2xl font-bold">{totalStats.totalLogs}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">총 성공 발송</p>
                  <div className="text-2xl font-bold text-green-600">{totalStats.totalSent}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">총 실패 건수</p>
                  <div className="text-2xl font-bold text-red-600">{totalStats.totalFailed}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">성공률</p>
                  <div className="text-2xl font-bold text-purple-600">{totalStats.successRate}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>상태별 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getStatusStats()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getStatusStats().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>월별 발송 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getMonthlyStats()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke="#10b981" name="성공" />
                    <Line type="monotone" dataKey="failed" stroke="#ef4444" name="실패" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              필터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">설문</label>
                <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 설문" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 설문</SelectItem>
                    {surveys.map(survey => (
                      <SelectItem key={survey.id} value={survey.id}>
                        {survey.title} ({survey.education_year}년 {survey.education_round}차)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">상태</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="success">성공</SelectItem>
                    <SelectItem value="failed">실패</SelectItem>
                    <SelectItem value="partial">부분성공</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">기간</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange ? format(dateRange, 'yyyy년 MM월', { locale: ko }) : '전체 기간'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">이메일 검색</label>
                <Input
                  placeholder="이메일 주소로 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 로그 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>발송 기록 ({getFilteredLogs().length}건)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>설문</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>수신자</TableHead>
                    <TableHead>성공/실패</TableHead>
                    <TableHead>발송일시</TableHead>
                    <TableHead>상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : getFilteredLogs().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        발송 기록이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredLogs().map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{getSurveyTitle(log.survey_id)}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                         <TableCell className="max-w-xs">
                           <div className="space-y-1">
                             {log.recipients.length > 0 ? (
                               <>
                                 <div className="text-sm font-medium">
                                   {log.recipients.length}명
                                 </div>
                                 <div className="text-xs text-muted-foreground truncate">
                                   {log.recipients.slice(0, 2).join(', ')}
                                   {log.recipients.length > 2 && ` 외 ${log.recipients.length - 2}명`}
                                 </div>
                               </>
                             ) : (
                               <div className="text-sm text-muted-foreground">없음</div>
                             )}
                           </div>
                         </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">{log.sent_count}</span>
                            {log.failed_count > 0 && (
                              <>
                                <span className="text-muted-foreground"> / </span>
                                <span className="text-red-600 font-medium">{log.failed_count}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>발송 상세 정보</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">기본 정보</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">설문:</span>
                                      <div>{getSurveyTitle(log.survey_id)}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">상태:</span>
                                      <div>{getStatusBadge(log.status)}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">발송일시:</span>
                                      <div>{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">성공/실패:</span>
                                      <div>{log.sent_count} / {log.failed_count}</div>
                                    </div>
                                  </div>
                                </div>
                                
                                 <div>
                                   <h4 className="font-medium mb-2">수신자 목록 ({log.recipients.length}명)</h4>
                                   <div className="max-h-32 overflow-y-auto bg-muted/30 p-3 rounded text-sm space-y-1">
                                     {log.recipients.map((email, index) => (
                                       <div key={index} className="py-1 px-2 bg-background rounded border text-sm">
                                         {email}
                                       </div>
                                     ))}
                                   </div>
                                 </div>

                                {log.error && (
                                  <div>
                                    <h4 className="font-medium mb-2 text-red-600">오류 정보</h4>
                                    <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                                      {log.error}
                                    </div>
                                  </div>
                                )}

                                {log.results && (
                                  <div>
                                    <h4 className="font-medium mb-2">상세 결과</h4>
                                    <div className="max-h-40 overflow-y-auto bg-muted/30 p-3 rounded text-sm">
                                      <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(log.results, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
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

export default EmailLogs;
