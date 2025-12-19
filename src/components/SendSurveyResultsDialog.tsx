import { useState, useEffect } from 'react';
import { Mail, Users, Eye, Send, ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { EmailRecipientPresets } from '@/components/EmailRecipientPresets';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SendSurveyResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  surveyTitle: string;
  responseCount: number;
  instructorId?: string | null;
  isInstructor?: boolean;
}

interface EmailPreview {
  subject: string;
  htmlContent: string;
  textContent: string;
  recipients: string[];
  previewNote?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  operator: '운영자',
  director: '조직장',
  instructor: '강사',
};

export const SendSurveyResultsDialog = ({
  open,
  onOpenChange,
  surveyId,
  surveyTitle,
  responseCount,
  instructorId,
  isInstructor = false,
}: SendSurveyResultsDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: 수신자 선택
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');

  // Step 2: 이메일 미리보기
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Step 3: 전송 결과
  const [sendResult, setSendResult] = useState<any>(null);

  // 발송 이력 및 강제 재전송
  const [previousLogs, setPreviousLogs] = useState<any[]>([]);
  const [forceResend, setForceResend] = useState(false);
  const [checkingLogs, setCheckingLogs] = useState(false);

  // 설문에 연결된 강사 목록 및 선택 (다중 강사 설문 대응)
  const [availableInstructors, setAvailableInstructors] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('all');

  // 역할별 실제 사용자 수
  const [roleUserCounts, setRoleUserCounts] = useState<Record<string, number>>({});

  // 다이얼로그가 열릴 때 초기화 및 이전 발송 로그 확인
  useEffect(() => {
    if (open) {
      setStep(1);
      // 강사는 본인만, 관리자/운영자는 강사 + 조직장에게 기본 발송
      setSelectedRoles(isInstructor ? ['instructor'] : ['instructor', 'director']);
      setAdditionalEmails([]);
      setNewEmail('');
      setEmailPreview(null);
      setSendResult(null);
      setPreviousLogs([]);
      setForceResend(false);
      setSelectedInstructorId(isInstructor && instructorId ? instructorId : 'all');

      // 이전 발송 이력 확인 및 강사 목록 로드
      checkPreviousLogs();
      fetchSurveyInstructors();
      fetchRoleUserCounts();
    }
  }, [open, isInstructor, instructorId, surveyId]);

  const fetchSurveyInstructors = async () => {
    try {
      const instructors: { id: string; name: string; email: string | null }[] = [];

      // 1. survey의 직접 instructor_id 확인
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('instructor_id')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      if (survey?.instructor_id) {
        const { data: instructor } = await supabase
          .from('instructors')
          .select('id, name, email')
          .eq('id', survey.instructor_id)
          .single();

        if (instructor) {
          instructors.push(instructor);
        }
      }

      // 2. survey_instructors 테이블에서 연결된 강사들 확인
      const { data: surveyInstructors, error: siError } = await supabase
        .from('survey_instructors')
        .select(`
          instructor_id,
          instructors (id, name, email)
        `)
        .eq('survey_id', surveyId);

      if (!siError && surveyInstructors) {
        surveyInstructors.forEach((si: any) => {
          if (si.instructors && !instructors.find(i => i.id === si.instructors.id)) {
            instructors.push(si.instructors);
          }
        });
      }

      setAvailableInstructors(instructors);
    } catch (error) {
      console.error('Failed to fetch survey instructors:', error);
    }
  };

  const fetchRoleUserCounts = async () => {
    try {
      const counts: Record<string, number> = {};

      // 각 역할별 사용자 수 조회
      for (const role of ['admin', 'operator', 'director', 'instructor'] as const) {
        if (role === 'instructor') {
          // 강사는 현재 설문에 연결된 강사만 카운트
          // fetchSurveyInstructors가 먼저 실행되어야 하므로 직접 조회
          const instructors: { id: string; name: string; email: string | null }[] = [];

          // 1. survey의 직접 instructor_id 확인
          const { data: survey } = await supabase
            .from('surveys')
            .select('instructor_id')
            .eq('id', surveyId)
            .single();

          if (survey?.instructor_id) {
            const { data: instructor } = await supabase
              .from('instructors')
              .select('id, name, email')
              .eq('id', survey.instructor_id)
              .single();
            if (instructor?.email) instructors.push(instructor);
          }

          // 2. survey_instructors 테이블에서 연결된 강사 확인
          const { data: surveyInstructors } = await supabase
            .from('survey_instructors')
            .select('instructor_id, instructors(id, name, email)')
            .eq('survey_id', surveyId);

          surveyInstructors?.forEach((si: any) => {
            if (si.instructors?.email && !instructors.find(i => i.id === si.instructors.id)) {
              instructors.push(si.instructors);
            }
          });

          // 3. survey_sessions 테이블에서 연결된 강사 확인
          const { data: sessions } = await supabase
            .from('survey_sessions')
            .select('instructor_id, instructors(id, name, email)')
            .eq('survey_id', surveyId)
            .not('instructor_id', 'is', null);

          sessions?.forEach((session: any) => {
            if (session.instructors?.email && !instructors.find(i => i.id === session.instructors.id)) {
              instructors.push(session.instructors);
            }
          });

          counts[role] = instructors.length;
        } else {
          // 다른 역할들은 기존 로직대로
          // 1단계: user_roles에서 해당 역할의 user_id 가져오기
          const { data: userRoles, error: roleError } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', role);

          if (roleError) {
            console.error(`Error fetching ${role} user_ids:`, roleError);
            continue;
          }

          if (!userRoles || userRoles.length === 0) {
            counts[role] = 0;
            continue;
          }

          const userIds = userRoles.map(ur => ur.user_id);

          // 2단계: profiles에서 해당 user_id들의 이메일 가져오기
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .in('id', userIds)
            .not('email', 'is', null);

          if (profileError) {
            console.error(`Error fetching ${role} profiles:`, profileError);
            continue;
          }

          counts[role] = profiles?.length || 0;
        }
      }

      setRoleUserCounts(counts);
    } catch (error) {
      console.error('Failed to fetch role user counts:', error);
    }
  };

  const checkPreviousLogs = async () => {
    setCheckingLogs(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPreviousLogs(data || []);
    } catch (error) {
      console.error('Failed to load previous logs:', error);
    } finally {
      setCheckingLogs(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    // 강사는 자신에게만 전송 가능
    if (isInstructor) {
      if (role === 'instructor') {
        setSelectedRoles(['instructor']);
      }
      return;
    }

    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleAddEmail = () => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast({
        title: '오류',
        description: '올바른 이메일 형식이 아닙니다.',
        variant: 'destructive',
      });
      return;
    }

    if (additionalEmails.includes(trimmed)) {
      toast({
        title: '오류',
        description: '이미 추가된 이메일입니다.',
        variant: 'destructive',
      });
      return;
    }

    setAdditionalEmails(prev => [...prev, trimmed]);
    setNewEmail('');
  };

  const handleRemoveEmail = (email: string) => {
    setAdditionalEmails(prev => prev.filter(e => e !== email));
  };

  const handleLoadPreset = (recipients: string[]) => {
    // 프리셋에서 역할과 이메일 분리
    const roles = recipients.filter(r => ['admin', 'operator', 'director', 'instructor'].includes(r));
    const emails = recipients.filter(r => r.includes('@'));

    if (isInstructor) {
      setSelectedRoles(['instructor']);
      setAdditionalEmails(emails);
    } else {
      setSelectedRoles(roles);
      setAdditionalEmails(emails);
    }
  };

  const generatePreview = async () => {
    try {
      setLoading(true);
      console.log('Generating preview via Edge Function for survey:', surveyId);

      const allRecipients = [...selectedRoles, ...additionalEmails];
      const requestBody = {
        surveyId,
        recipients: allRecipients,
        previewOnly: true,
        targetInstructorIds: selectedInstructorId !== 'all' ? [selectedInstructorId] : undefined
      };

      const { data, error } = await supabase.functions.invoke('send-survey-results', {
        body: requestBody,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || '미리보기 생성 실패');

      setEmailPreview({
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.htmlContent.replace(/<[^>]*>/g, ''), // Simple fallback
        recipients: data.recipients,
        previewNote: data.previewNote
      });

      setStep(2);
    } catch (err: any) {
      console.error('Preview generation failed:', err);
      toast({
        title: "미리보기 생성 실패",
        description: err.message || "오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      // 응답이 없으면 경고
      if (responseCount === 0) {
        toast({
          title: '전송 불가',
          description: '응답이 없는 설문은 이메일을 전송할 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      // 수신자가 없으면 경고
      if (selectedRoles.length === 0 && additionalEmails.length === 0) {
        toast({
          title: '오류',
          description: '최소 1명 이상의 수신자를 선택해주세요.',
          variant: 'destructive',
        });
        return;
      }
      await generatePreview();
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const allRecipients = [...selectedRoles, ...additionalEmails];

      const requestBody: any = {
        surveyId,
        recipients: allRecipients,
        force: forceResend,
      };

      // 특정 강사가 선택된 경우에만 targetInstructorIds 전달
      if (selectedInstructorId !== 'all') {
        requestBody.targetInstructorIds = [selectedInstructorId];
      }

      const { data, error } = await supabase.functions.invoke('send-survey-results', {
        body: requestBody,
      });

      if (error) throw error;

      setSendResult(data);

      const sentCount = typeof data?.sent === 'number' ? data.sent : Array.isArray(data?.sent) ? data.sent.length : 0;
      const totalCount = typeof data?.total === 'number' ? data.total : (Array.isArray(data?.recipients) ? data.recipients.length : sentCount);

      if (data?.alreadySent) {
        toast({
          title: '이미 발송됨',
          description: `이 설문은 이전에 전송 완료되어 재전송이 건너뛰어졌습니다. (대상: ${totalCount}명)`,
        });
      } else {
        toast({
          title: data?.success ? '전송 완료' : '전송 완료(일부 실패)',
          description: `${sentCount}명에게 이메일이 전송되었습니다${typeof data?.failed === 'number' && data.failed > 0 ? ` (실패 ${data.failed}명)` : ''}.`,
        });
      }

      // 성공 후 다이얼로그 닫기
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to send results:', error);
      toast({
        title: '전송 실패',
        description: error.message || '이메일 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 역할별 실제 사용자 수를 반영하여 총 수신자 수 계산
  const totalRecipients = selectedRoles.reduce((sum, role) => sum + (roleUserCounts[role] || 0), 0) + additionalEmails.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            설문 결과 이메일 전송
          </DialogTitle>
          <DialogDescription>
            {surveyTitle} · 응답 {responseCount}개
          </DialogDescription>
        </DialogHeader>

        {/* 단계 표시 */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'}`}>
              1
            </div>
            <span className="text-sm font-medium">수신자 선택</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'}`}>
              2
            </div>
            <span className="text-sm font-medium">미리보기</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'}`}>
              3
            </div>
            <span className="text-sm font-medium">전송 확인</span>
          </div>
        </div>

        {/* 단계별 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-1">
          {/* Step 1: 수신자 선택 */}
          {step === 1 && (
            <div className="space-y-6">
              {isInstructor && (
                <Alert>
                  <AlertDescription>
                    강사는 본인에게만 결과를 전송할 수 있습니다.
                  </AlertDescription>
                </Alert>
              )}

              {/* 강사 선택 (다중 강사 설문용) */}
              {availableInstructors.length > 1 && selectedRoles.includes('instructor') && !isInstructor && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">강사 선택</Label>
                  <Select value={selectedInstructorId} onValueChange={setSelectedInstructorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="강사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 강사</SelectItem>
                      {availableInstructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.name} {instructor.email && `<${instructor.email}>`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    여러 강사가 있는 설문입니다. 특정 강사에게만 전송하려면 선택하세요.
                  </p>
                </div>
              )}

              {/* 역할 선택 */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">역할별 수신자</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(ROLE_LABELS).map(([role, label]) => {
                    return (
                      <div
                        key={role}
                        className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${selectedRoles.includes(role)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                          } cursor-pointer`}
                        onClick={() => {
                          if (selectedRoles.includes(role)) {
                            setSelectedRoles(prev => prev.filter(r => r !== role));
                          } else {
                            setSelectedRoles(prev => [...prev, role]);
                          }
                        }}
                      >
                        <Checkbox
                          id={`role-${role}`}
                          checked={selectedRoles.includes(role)}
                          onCheckedChange={() => { }}
                        />
                        <Label
                          htmlFor={`role-${role}`}
                          className="flex-1 cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 추가 이메일 */}
              {!isInstructor && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">추가 이메일 주소</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEmail();
                        }
                      }}
                    />
                    <Button onClick={handleAddEmail} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {additionalEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {additionalEmails.map((email) => (
                        <Badge key={email} variant="secondary" className="px-3 py-1">
                          {email}
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            className="ml-2 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 프리셋 */}
              {!isInstructor && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">수신자 프리셋</Label>
                  <EmailRecipientPresets
                    onLoadPreset={handleLoadPreset}
                    currentRecipients={[...selectedRoles, ...additionalEmails]}
                  />
                </div>
              )}

              {/* 이전 발송 이력 */}
              {previousLogs.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">발송 이력</Label>
                  <Alert variant={previousLogs.some(log => log.status === 'success') ? 'default' : 'destructive'}>
                    <AlertDescription>
                      <div className="space-y-3">
                        {previousLogs.slice(0, 3).map((log, index) => {
                          const surveyInfo = log.results?.survey_info;
                          const emailResults = log.results?.emailResults || [];
                          const sentRecipients = emailResults.filter((r: any) => r.status === 'sent');
                          const failedRecipients = emailResults.filter((r: any) => r.status === 'failed');

                          return (
                            <div key={log.id} className="space-y-2 pb-3 border-b last:border-b-0">
                              <div className="text-sm">
                                <strong>{index + 1}.</strong> {new Date(log.created_at).toLocaleString('ko-KR')} -
                                <span className={`ml-1 font-semibold ${log.status === 'success' ? 'text-green-600' :
                                  log.status === 'partial' ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                  {log.status === 'success' ? '전체 성공' :
                                    log.status === 'partial' ? '부분 성공' : '실패'}
                                </span>
                                {' '}({log.sent_count || 0}명 발송)
                              </div>

                              {surveyInfo && (
                                <div className="text-xs text-muted-foreground pl-5">
                                  강사: {surveyInfo.instructor || '미등록'} · {surveyInfo.course || '강의'} ({surveyInfo.year}-{surveyInfo.round}차)
                                </div>
                              )}

                              {sentRecipients.length > 0 && (
                                <div className="pl-5 text-xs">
                                  <div className="font-medium text-green-600 mb-1">✓ 발송 성공 ({sentRecipients.length}명):</div>
                                  <div className="flex flex-wrap gap-1">
                                    {sentRecipients.map((r: any, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                                        {r.name} {r.to && `<${r.to}>`}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {failedRecipients.length > 0 && (
                                <div className="pl-5 text-xs">
                                  <div className="font-medium text-red-600 mb-1">✗ 발송 실패 ({failedRecipients.length}명):</div>
                                  <div className="flex flex-wrap gap-1">
                                    {failedRecipients.map((r: any, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                                        {r.name} {r.to && `<${r.to}>`}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {previousLogs.some(log => log.status === 'success') && !forceResend && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium text-amber-700">
                              ⚠️ 이미 성공적으로 발송된 이력이 있습니다. 중복 발송을 방지하기 위해 이전에 발송된 수신자는 제외됩니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                    <Checkbox
                      id="force-resend"
                      checked={forceResend}
                      onCheckedChange={(checked) => setForceResend(checked as boolean)}
                    />
                    <Label
                      htmlFor="force-resend"
                      className="text-sm cursor-pointer text-amber-900 dark:text-amber-100"
                    >
                      <strong>강제 재전송</strong> (이전 발송 이력 무시하고 모든 수신자에게 다시 전송)
                    </Label>
                  </div>
                </div>
              )}

              {/* 선택 요약 */}
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  선택된 수신자: <strong>{totalRecipients}명</strong>
                  {selectedRoles.length > 0 && (
                    <div className="mt-1 text-sm">
                      역할: {selectedRoles.map(r => ROLE_LABELS[r]).join(', ')}
                    </div>
                  )}
                  {additionalEmails.length > 0 && (
                    <div className="mt-1 text-sm">
                      추가 이메일: {additionalEmails.length}개
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: 이메일 미리보기 */}
          {step === 2 && emailPreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">이메일 미리보기</Label>
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === 'html' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('html')}
                  >
                    HTML
                  </Button>
                  <Button
                    variant={previewMode === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('text')}
                  >
                    텍스트
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm">
                  <strong>제목:</strong> {emailPreview.subject}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">수신자: {emailPreview.recipients.length}명</div>
                  <div className="space-y-1 pl-4 max-h-40 overflow-y-auto">
                    {emailPreview.recipients.map((recipient, idx) => (
                      <div key={idx} className="text-sm font-mono text-muted-foreground">
                        📧 {recipient}
                      </div>
                    ))}
                  </div>
                </div>
                {emailPreview.previewNote && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      ℹ️ {emailPreview.previewNote}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="border rounded-lg p-4 bg-background max-h-96 overflow-y-auto">
                {previewMode === 'html' ? (
                  <div dangerouslySetInnerHTML={{ __html: emailPreview.htmlContent }} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {emailPreview.textContent}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Step 3: 전송 확인 */}
          {step === 3 && (
            <div className="space-y-4">
              <Alert>
                <Send className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">이메일을 전송하시겠습니까?</div>
                  <div className="space-y-1 text-sm">
                    <div>• 설문: {surveyTitle}</div>
                    <div>• 응답 수: {responseCount}개</div>
                    <div>• 수신자: {totalRecipients}명</div>
                    {selectedRoles.length > 0 && (
                      <div>• 역할: {selectedRoles.map(r => ROLE_LABELS[r]).join(', ')}</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {sendResult && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>✓ 전송 완료: {sendResult.sent?.length || 0}명</div>
                      {sendResult.failed && sendResult.failed.length > 0 && (
                        <div className="text-destructive">
                          ✗ 전송 실패: {sendResult.failed.length}명
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePreviousStep}
            disabled={step === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            이전
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              취소
            </Button>

            {step < 3 ? (
              <Button onClick={handleNextStep} disabled={loading || totalRecipients === 0}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    로딩 중...
                  </>
                ) : (
                  <>
                    다음
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={loading || sendResult}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    전송
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
