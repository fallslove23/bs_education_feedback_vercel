import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts';
import { Mail, CheckCircle, XCircle, Clock, RefreshCw, Clipboard, Download, ListChecks, FileText, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
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
      // Use RPC function that includes proper permission checks
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
      // 병렬로 수집: 강사 이메일 + 역할 기반 프로필 이메일 + 최근 로그 수신자
      const [instructorsRes, rolesRes] = await Promise.all([
        supabase.from('instructors').select('email').not('email', 'is', null),
        supabase.from('user_roles').select('user_id, role').in('role', ['admin','operator','director','instructor'] as any)
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

      // 최근 이메일 로그에 있는 수신자까지 포함
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

  if (!canViewLogs) {
    return (
      <DashboardLayout
        title="이메일 로그"
        subtitle="이메일 발송 이력 및 상태 확인"
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

  const totalStats = {
    totalLogs: emailLogs.length,
    successCount: emailLogs.filter(log => log.status === 'success').length,
    failedCount: emailLogs.filter(log => log.status === 'failed').length,
    pendingCount: emailLogs.filter(log => log.status === 'pending').length,
    duplicateBlocked: emailLogs.reduce((sum, log) => 
      sum + (log.results?.statistics?.duplicate_blocked || 0), 0
    )
  };

  const getSurveyInfo = (surveyId: string) => {
    const info = surveyDetails[surveyId];

    if (!info) {
      return {
        title: '설문 정보 없음',
        meta: undefined,
      };
    }

    const segments: string[] = [];
    if (info.education_year) {
      segments.push(`${info.education_year}년`);
    }
    if (info.education_round) {
      segments.push(`${info.education_round}차`);
    }

    return {
      title: info.title,
      meta: segments.length > 0 ? segments.join(' ') : undefined,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">성공</Badge>;
      case 'failed':
        return <Badge variant="destructive">실패</Badge>;
      case 'pending':
        return <Badge variant="secondary">대기</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="이메일 로그"
      subtitle="이메일 발송 이력 및 상태 확인"
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
        {/* 자동 이메일 전송 제어 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <Label htmlFor="auto-email-toggle" className="text-base font-semibold cursor-pointer">
                    자동 이메일 전송
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  설문 종료 시 자동으로 결과를 이메일로 발송합니다
                </p>
              </div>
              <Switch
                id="auto-email-toggle"
                checked={autoEmailEnabled}
                onCheckedChange={toggleAutoEmail}
                disabled={toggleLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <div className="text-2xl font-bold">{totalStats.successCount}</div>
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
                  <div className="text-2xl font-bold">{totalStats.failedCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">중복 차단</p>
                  <div className="text-2xl font-bold">{totalStats.duplicateBlocked}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-purple-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">성공률</p>
                  <div className="text-2xl font-bold">
                    {totalStats.totalLogs > 0 ? Math.round((totalStats.successCount / totalStats.totalLogs) * 100) : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 이메일 로그 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>설문 결과 이메일 발송 기록 및 통계</CardTitle>
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
                    <TableHead>상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-muted-foreground">이메일 발송 기록이 없습니다.</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    emailLogs.map((log) => {
                      const surveyInfo = getSurveyInfo(log.survey_id);

                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{surveyInfo.title}</div>
                              {surveyInfo.meta && (
                                <div className="text-xs text-muted-foreground">{surveyInfo.meta}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleString('ko-KR')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {log.results?.emailResults ? (
                                <div className="text-sm">
                                  {log.results.emailResults.slice(0, 3).map((result: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      {result.status === 'sent' ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <XCircle className="h-3 w-3 text-red-600" />
                                      )}
                                      <span className="font-medium">{result.name || result.to?.split('@')[0]}</span>
                                      <span className="text-xs text-muted-foreground">({result.to})</span>
                                    </div>
                                  ))}
                                  {log.results.emailResults.length > 3 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      외 {log.results.emailResults.length - 3}명
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm">{log.recipients?.length || 0}명</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>성공: {log.sent_count || 0}명</span>
                              </div>
                              {log.failed_count > 0 && (
                                <div className="flex items-center gap-2 text-red-600">
                                  <XCircle className="h-4 w-4" />
                                  <span>실패: {log.failed_count}명</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <FileText className="h-4 w-4 mr-2" />
                                  상세
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>이메일 발송 상세 정보</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <Mail className="h-4 w-4" />
                                      설문 정보
                                    </h4>
                                    <div className="p-3 bg-muted rounded-lg">
                                      <p className="font-medium">{surveyInfo.title}</p>
                                      {surveyInfo.meta && (
                                        <p className="text-sm text-muted-foreground mt-1">{surveyInfo.meta}</p>
                                      )}
                                      <p className="text-sm text-muted-foreground mt-1">
                                        발송 시간: {new Date(log.created_at).toLocaleString('ko-KR')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                   {log.results?.statistics && (
                                    <div>
                                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        발송 통계
                                      </h4>
                                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                          <p className="text-sm text-muted-foreground">총 수신자</p>
                                          <p className="text-xl font-bold">{log.results.statistics.total_recipients || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">중복 차단</p>
                                          <p className="text-xl font-bold text-yellow-600">{log.results.statistics.duplicate_blocked || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">전체 결과 수신</p>
                                          <p className="text-xl font-bold text-blue-600">{log.results.statistics.by_scope?.full || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">개별 결과 수신</p>
                                          <p className="text-xl font-bold text-purple-600">{log.results.statistics.by_scope?.filtered || 0}</p>
                                        </div>
                                      </div>
                                      {log.results.statistics.by_role && (
                                        <div className="mt-4">
                                          <p className="text-sm font-medium mb-2">역할별 발송 현황</p>
                                          <div className="space-y-2">
                                            {Object.entries(log.results.statistics.by_role).map(([role, stats]: [string, any]) => (
                                              <div key={role} className="flex items-center justify-between p-2 bg-background rounded border">
                                                <span className="font-medium capitalize">{role}</span>
                                                <div className="flex gap-4 text-sm">
                                                  <span className="text-green-600">발송: {stats.sent}</span>
                                                  {stats.failed > 0 && <span className="text-red-600">실패: {stats.failed}</span>}
                                                  {stats.duplicate_blocked > 0 && <span className="text-yellow-600">중복: {stats.duplicate_blocked}</span>}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {log.results?.recipientDetails && (
                                    <div>
                                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        수신자별 상세 ({log.results.recipientDetails.length}명)
                                      </h4>
                                      <ScrollArea className="h-[400px]">
                                        <div className="space-y-2">
                                          {log.results.recipientDetails.map((detail: any, idx: number) => (
                                            <div 
                                              key={idx} 
                                              className={`p-3 rounded-lg border ${
                                                detail.status === 'sent' 
                                                  ? 'bg-green-50 border-green-200' 
                                                  : detail.status === 'duplicate_blocked'
                                                  ? 'bg-yellow-50 border-yellow-200'
                                                  : 'bg-red-50 border-red-200'
                                              }`}
                                            >
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    {detail.status === 'sent' ? (
                                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : detail.status === 'duplicate_blocked' ? (
                                                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                                                    ) : (
                                                      <XCircle className="h-4 w-4 text-red-600" />
                                                    )}
                                                    <span className="font-medium">{detail.email}</span>
                                                  </div>
                                                  <div className="flex gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="outline" className="capitalize">{detail.role}</Badge>
                                                    {detail.dataScope && (
                                                      <Badge variant={detail.dataScope === 'full' ? 'default' : 'secondary'}>
                                                        {detail.dataScope === 'full' ? '전체 결과' : '개별 결과'}
                                                      </Badge>
                                                    )}
                                                    {detail.status === 'duplicate_blocked' && (
                                                      <Badge variant="outline" className="bg-yellow-100">중복 차단</Badge>
                                                    )}
                                                  </div>
                                                  {detail.error && (
                                                    <p className="text-xs text-red-600 mt-2">{detail.error}</p>
                                                  )}
                                                  {detail.reason && (
                                                    <p className="text-xs text-yellow-700 mt-2">{detail.reason}</p>
                                                  )}
                                                </div>
                                                {detail.emailId && (
                                                  <span className="text-xs text-muted-foreground">ID: {detail.emailId.slice(0, 8)}...</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  )}
                                  
                                  {!log.results?.recipientDetails && log.results?.emailResults && (
                                    <div>
                                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        수신자별 발송 결과 ({log.results.emailResults.length}명)
                                      </h4>
                                      <div className="space-y-2">
                                        {log.results.emailResults.map((result: any, idx: number) => (
                                          <div 
                                            key={idx} 
                                            className={`p-3 rounded-lg border ${
                                              result.status === 'sent' 
                                                ? 'bg-green-50 border-green-200' 
                                                : 'bg-red-50 border-red-200'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex items-start gap-3 flex-1">
                                                {result.status === 'sent' ? (
                                                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                                ) : (
                                                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                                )}
                                                <div className="flex-1">
                                                  <div className="font-medium text-sm">
                                                    {result.name || result.to?.split('@')[0]}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground mt-1">
                                                    {result.to}
                                                  </div>
                                                  {result.error && (
                                                    <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                                                      <div className="flex items-start gap-2">
                                                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                          <strong>오류:</strong> {result.error}
                                                          {result.errorCode && (
                                                            <div className="mt-1">(코드: {result.errorCode})</div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                  {result.messageId && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                      Message ID: {result.messageId}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              <Badge variant={result.status === 'sent' ? 'default' : 'destructive'}>
                                                {result.status === 'sent' ? '발송 완료' : '발송 실패'}
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {!log.results?.emailResults && log.recipients && (
                                    <div>
                                      <h4 className="font-semibold mb-3">수신자 목록</h4>
                                      <div className="text-sm space-y-1">
                                        {log.recipients.map((recipient: string, idx: number) => (
                                          <div key={idx} className="p-2 bg-muted rounded">
                                            {recipient}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {log.results && (
                                    <div>
                                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        전체 응답 데이터 (디버깅용)
                                      </h4>
                                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96 font-mono">
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

          <div className="text-xs text-muted-foreground pt-2">
            참고: Resend Test Emails는 도메인 검증 없이 허용 목록에 추가된 주소만 수신 가능합니다.
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardEmailLogs;
