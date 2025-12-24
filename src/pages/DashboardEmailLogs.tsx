import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layouts';
import { Mail, CheckCircle, XCircle, Clock, RefreshCw, Clipboard, Download, ListChecks, FileText, Users, AlertCircle, CheckCircle2, Filter, Calendar as CalendarIcon, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface EmailLog {
  id: string;
  survey_id: string;
  recipients: string[];
  status: string;
  sent_count: number;
  failed_count: number;
  results: any;
  created_at: string;
}

interface SurveyDetails {
  id: string;
  title: string;
  education_year: number | null;
  education_round: number | null;
}

const DashboardEmailLogs = () => {
  const { userRoles } = useAuth();
  const { toast } = useToast();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowlistOpen, setAllowlistOpen] = useState(false);
  const [allowlistLoading, setAllowlistLoading] = useState(false);
  const [allowlistEmails, setAllowlistEmails] = useState<string[]>([]);
  const [surveyDetails, setSurveyDetails] = useState<Record<string, SurveyDetails>>({});
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Filters
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const canViewLogs = userRoles.includes('admin') || userRoles.includes('operator');

  const fetchSurveyDetails = async (logs: EmailLog[]) => {
    const surveyIds = Array.from(
      new Set(
        logs
          .map((log) => log.survey_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (surveyIds.length === 0) {
      setSurveyDetails({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, title, education_year, education_round')
        .in('id', surveyIds);

      if (error) throw error;

      const details = (data || []).reduce<Record<string, SurveyDetails>>((acc, survey) => {
        acc[survey.id] = {
          id: survey.id,
          title: survey.title,
          education_year: survey.education_year ?? null,
          education_round: survey.education_round ?? null,
        };
        return acc;
      }, {});

      setSurveyDetails(details);
    } catch (error) {
      console.error('Error fetching survey details:', error);
    }
  };

  const fetchAutoEmailSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('cron_settings')
        .select('value')
        .eq('key', 'auto_email_enabled')
        .single();

      if (error) throw error;
      setAutoEmailEnabled(data?.value === 'true');
    } catch (error) {
      console.error('Error fetching auto email setting:', error);
    }
  };

  const toggleAutoEmail = async (enabled: boolean) => {
    try {
      setToggleLoading(true);
      const { error } = await supabase
        .from('cron_settings')
        .update({ value: enabled ? 'true' : 'false' })
        .eq('key', 'auto_email_enabled');

      if (error) throw error;

      setAutoEmailEnabled(enabled);
      toast({
        title: enabled ? '자동 이메일 전송 활성화' : '자동 이메일 전송 비활성화',
        description: enabled
          ? '설문 종료 시 자동으로 이메일이 발송됩니다.'
          : '자동 이메일 전송이 중지되었습니다.',
      });
    } catch (error) {
      console.error('Error toggling auto email:', error);
      toast({
        title: '오류',
        description: '설정 변경에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setToggleLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_email_logs' as any);

      if (error) throw error;
      const normalizedLogs = (data || []) as EmailLog[];
      setEmailLogs(normalizedLogs);
      await fetchSurveyDetails(normalizedLogs);
    } catch (error) {
      console.error('Error fetching email logs:', error);
      toast({
        title: "오류",
        description: "이메일 로그를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowlistEmails = async () => {
    try {
      setAllowlistLoading(true);
      const [instructorsRes, rolesRes] = await Promise.all([
        supabase.from('instructors').select('email').not('email', 'is', null),
        supabase.from('user_roles').select('user_id, role').in('role', ['admin', 'operator', 'director', 'instructor'] as any)
      ]);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const set = new Set<string>();

      instructorsRes.data?.forEach((i: any) => {
        if (i?.email && emailRegex.test(i.email)) set.add(i.email.toLowerCase());
      });

      const ids = Array.from(new Set((rolesRes.data || []).map((r: any) => r.user_id)));
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id,email').in('id', ids);
        profiles?.forEach((p: any) => {
          if (p?.email && emailRegex.test(p.email)) set.add(p.email.toLowerCase());
        });
      }

      emailLogs.forEach((log) => (log.recipients || []).forEach((e) => {
        if (e && emailRegex.test(e)) set.add(String(e).toLowerCase());
      }));

      const list = Array.from(set).sort();
      setAllowlistEmails(list);
      setAllowlistOpen(true);
      toast({ title: '허용 목록 추출 완료', description: `${list.length}개의 이메일이 수집되었습니다.` });
    } catch (err) {
      console.error('allowlist build error', err);
      toast({ title: '오류', description: '허용 목록용 이메일을 수집하지 못했습니다.', variant: 'destructive' });
    } finally {
      setAllowlistLoading(false);
    }
  };

  const copyAllowlist = async () => {
    await navigator.clipboard.writeText(allowlistEmails.join(', '));
    toast({ title: '복사 완료', description: '이메일이 클립보드에 복사되었습니다.' });
  };

  const downloadAllowlistCsv = () => {
    const blob = new Blob([allowlistEmails.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resend-allowlist-emails.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (canViewLogs) {
      fetchEmailLogs();
      fetchAutoEmailSetting();
    }
  }, [canViewLogs]);

  // Derived state for filtered logs
  const filteredLogs = useMemo(() => {
    return emailLogs.filter(log => {
      // Survey Filter
      if (selectedSurvey !== 'all' && log.survey_id !== selectedSurvey) return false;

      // Status Filter
      if (selectedStatus !== 'all' && log.status !== selectedStatus) return false;

      // Date Filter
      if (dateRange) {
        const logDate = new Date(log.created_at);
        const start = startOfDay(dateRange);
        const end = endOfDay(dateRange);
        if (!(logDate >= start && logDate <= end)) return false;
      }

      // Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const surveyInfo = surveyDetails[log.survey_id];
        const titleMatch = surveyInfo?.title?.toLowerCase().includes(term);
        const recipientMatch = log.recipients.some(r => r.toLowerCase().includes(term));
        if (!titleMatch && !recipientMatch) return false;
      }

      return true;
    });
  }, [emailLogs, selectedSurvey, selectedStatus, dateRange, searchTerm, surveyDetails]);

  // Monthly stats for chart
  const monthlyStats = useMemo(() => {
    const stats: Record<string, { sent: number; failed: number }> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      stats[key] = { sent: 0, failed: 0 };
    }

    emailLogs.forEach(log => {
      const key = format(new Date(log.created_at), 'yyyy-MM');
      if (stats[key]) {
        stats[key].sent += log.sent_count;
        stats[key].failed += log.failed_count;
      }
    });

    return Object.entries(stats).map(([key, value]) => ({
      name: format(new Date(key), 'MMM', { locale: ko }), // 12월, 1월 etc
      fullDate: key,
      성공: value.sent,
      실패: value.failed
    }));
  }, [emailLogs]); // Use raw logs for global trend

  const totalStats = {
    totalLogs: filteredLogs.length,
    successCount: filteredLogs.reduce((acc, log) => acc + (log.sent_count || 0), 0),
    failedCount: filteredLogs.reduce((acc, log) => acc + (log.failed_count || 0), 0),
    duplicateBlocked: filteredLogs.reduce((sum, log) => sum + (log.results?.statistics?.duplicate_blocked || 0), 0)
  };

  const getSurveyInfo = (surveyId: string) => {
    const info = surveyDetails[surveyId];
    if (!info) return { title: '설문 정보 없음', meta: undefined };

    const segments: string[] = [];
    if (info.education_year) segments.push(`${info.education_year}년`);
    if (info.education_round) segments.push(`${info.education_round}차`);

    return { title: info.title, meta: segments.length > 0 ? segments.join(' ') : undefined };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">성공</Badge>;
      case 'failed': return <Badge variant="destructive">실패</Badge>;
      case 'pending': return <Badge variant="secondary">대기</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!canViewLogs) {
    return (
      <DashboardLayout
        title="이메일 로그"
        icon={<Mail className="h-5 w-5 text-white" />}
      >
        <div className="flex items-center justify-center py-8">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">접근 권한 없음</h3>
              <p className="text-muted-foreground">이메일 로그를 조회할 권한이 없습니다.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="이메일 로그"
      icon={<Mail className="h-5 w-5 text-white" />}
      loading={loading}
      actions={[
        <Button key="refresh" onClick={fetchEmailLogs} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>,
        <Button key="allowlist" onClick={fetchAllowlistEmails} variant="default" size="sm" disabled={allowlistLoading}>
          <ListChecks className="h-4 w-4 mr-2" />
          허용목록용 이메일 추출
        </Button>
      ]}
    >
      <div className="space-y-6">
        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 발송</p>
                <div className="text-2xl font-bold">{totalStats.totalLogs}</div>
              </div>
              <Mail className="h-8 w-8 text-blue-100 text-blue-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">성공</p>
                <div className="text-2xl font-bold text-green-600">{totalStats.successCount}</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">실패</p>
                <div className="text-2xl font-bold text-red-600">{totalStats.failedCount}</div>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">중복 차단</p>
                <div className="text-2xl font-bold text-yellow-600">{totalStats.duplicateBlocked}</div>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 월별 발송 통계 차트 (Main Feature) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                월별 발송 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      cursor={{ fill: '#f1f5f9' }}
                    />
                    <Legend />
                    <Bar dataKey="성공" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="실패" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 자동 발송 설정 카드 (Compact) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">자동 발송 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">자동 전송</Label>
                    <p className="text-xs text-muted-foreground">설문 종료 시 결과 발송</p>
                  </div>
                  <Switch
                    checked={autoEmailEnabled}
                    onCheckedChange={toggleAutoEmail}
                    disabled={toggleLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 필터 카드 (Mobile/Desktop stacked) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  필터 검색
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">설문 선택</Label>
                  <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="전체 설문" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 설문</SelectItem>
                      {Object.values(surveyDetails).map((survey) => (
                        <SelectItem key={survey.id} value={survey.id}>
                          {survey.title.length > 15 ? survey.title.slice(0, 15) + '...' : survey.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">상태</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="모든 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 상태</SelectItem>
                      <SelectItem value="success">성공</SelectItem>
                      <SelectItem value="failed">실패</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">날짜 (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-8 justify-start text-left font-normal text-xs">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {dateRange ? format(dateRange, 'yyyy-MM-dd') : '날짜 선택'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {dateRange && (
                    <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="h-6 text-xs w-full">
                      초기화
                    </Button>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">검색</Label>
                  <Input
                    placeholder="수신자 이메일, 설문명"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 로그 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">상세 로그 목록 ({filteredLogs.length}건)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>설문 정보</TableHead>
                    <TableHead>수신자</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>발송 결과</TableHead>
                    <TableHead>일시</TableHead>
                    <TableHead>상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">검색 결과가 없습니다.</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => {
                      const surveyInfo = getSurveyInfo(log.survey_id);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="space-y-1 max-w-[200px]">
                              <div className="font-medium truncate" title={surveyInfo.title}>{surveyInfo.title}</div>
                              {surveyInfo.meta && (
                                <div className="text-xs text-muted-foreground">{surveyInfo.meta}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <span className="text-sm">{log.recipients?.length || 0}명</span>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {log.recipients?.[0] || '-'}
                                {log.recipients?.length > 1 && ` 외 ${log.recipients.length - 1}명`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              {log.sent_count > 0 && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>{log.sent_count}</span>
                                </div>
                              )}
                              {log.failed_count > 0 && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-3 w-3" />
                                  <span>{log.failed_count}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>이메일 발송 상세 정보</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6">
                                  {/* Details Content (Same as before) */}
                                  <div className="p-3 bg-muted rounded-lg">
                                    <p className="font-medium">{surveyInfo.title}</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      발송 시간: {new Date(log.created_at).toLocaleString('ko-KR')}
                                    </p>
                                  </div>

                                  {log.results?.recipientDetails && (
                                    <div className="border rounded-md p-4">
                                      <h4 className="font-semibold mb-3">수신자 상세 리스트</h4>
                                      <ScrollArea className="h-[300px]">
                                        <div className="space-y-2">
                                          {log.results.recipientDetails.map((detail: any, idx: number) => (
                                            <div key={idx} className="flex justify-between p-2 border-b last:border-0 text-sm">
                                              <span>{detail.email}</span>
                                              <Badge variant={detail.status === 'sent' ? 'outline' : 'destructive'}>
                                                {detail.status}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  )}

                                  {!log.results?.recipientDetails && log.recipients && (
                                    <div className="border rounded-md p-4">
                                      <h4 className="font-semibold mb-3">수신자 목록</h4>
                                      <div className="max-h-60 overflow-y-auto text-sm">
                                        {log.recipients.join(', ')}
                                      </div>
                                    </div>
                                  )}

                                  {log.results && (
                                    <div className="mt-4">
                                      <h4 className="font-semibold mb-2">JSON 데이터</h4>
                                      <pre className="text-xs bg-slate-950 text-slate-50 p-4 rounded overflow-auto max-h-40">
                                        {JSON.stringify(log.results, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allowlist Dialog (Same as before) */}
      <Dialog open={allowlistOpen} onOpenChange={setAllowlistOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Resend 허용 목록용 이메일</DialogTitle>
            <DialogDescription>
              onboarding@resend.dev 사용 시, 아래 이메일을 Resend &gt; Settings &gt; Test Emails에 추가해야 발송됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2">
            <div className="text-sm text-muted-foreground">총 {allowlistEmails.length}개</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyAllowlist} disabled={allowlistEmails.length === 0}>
                <Clipboard className="h-4 w-4 mr-1" /> 복사
              </Button>
              <Button size="sm" variant="secondary" onClick={downloadAllowlistCsv} disabled={allowlistEmails.length === 0}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>

          <ScrollArea className="h-72 rounded-md border p-3">
            <pre className="whitespace-pre-wrap text-sm leading-6">{allowlistEmails.join('\n')}</pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardEmailLogs;
