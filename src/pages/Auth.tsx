import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { translateAuthError } from '@/utils/authErrorTranslator';
import { getBaseUrl } from '@/lib/utils';
import { FieldErrors, useForm } from 'react-hook-form';

type AuthFormValues = {
  email: string;
  password?: string;
};

const Auth = () => {
  const navigate = useNavigate();
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<AuthFormValues>({
    mode: 'onChange',
    shouldUnregister: true,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isResetPassword) {
      setValue('password', '');
    }
  }, [isResetPassword, setValue]);

  const focusFirstError = (formErrors: FieldErrors<AuthFormValues>) => {
    const firstErrorField = Object.keys(formErrors)[0] as keyof AuthFormValues | undefined;
    if (firstErrorField) {
      setFocus(firstErrorField);
    }
  };

  const handleLogin = async ({ email, password }: AuthFormValues) => {
    if (!password) {
      setFocus('password');
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Check if this is first login for instructor
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_login')
          .eq('id', data.user.id)
          .single();

        if (!profileError && profile?.first_login) {
          // First login - redirect to password change
          navigate('/change-password');
          toast({
            title: "첫 로그인",
            description: "비밀번호를 변경해주세요.",
          });
        } else {
          // Normal login - force page reload to ensure proper redirect
          window.location.href = '/default-redirect';
          toast({
            title: "로그인 성공",
            description: "대시보드로 이동합니다.",
          });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setFocus('email');
      toast({
        title: "로그인 실패",
        description: translateAuthError(error.message || '알 수 없는 오류가 발생했습니다.'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async ({ email }: AuthFormValues) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getBaseUrl()}/change-password`
      });
      
      if (error) throw error;
      
      toast({
        title: "비밀번호 재설정 이메일 발송",
        description: "이메일을 확인하여 비밀번호를 재설정해주세요.",
      });
      
      setIsResetPassword(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setFocus('email');
      toast({
        title: "비밀번호 재설정 오류",
        description: translateAuthError(error.message || '비밀번호 재설정 중 오류가 발생했습니다.'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/30 opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-gradient-primary blur-3xl opacity-25"
        aria-hidden="true"
      />
      {/* Header with back button */}
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 py-3 flex items-center">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="mr-3 touch-friendly"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">메인으로</span>
            <span className="sm:hidden">메인</span>
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-lg sm:text-2xl font-bold text-primary">관리자/강사 로그인</h1>
            <p className="text-sm text-muted-foreground">설문 결과 조회 및 관리</p>
          </div>
        </div>
      </header>

      {/* Main content - 개선된 반응형 중앙 정렬 */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl mx-auto">
          <Card className="w-full shadow-xl border border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardHeader className="text-center pb-6 px-6 sm:px-8 lg:px-10 pt-8">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold">
                {isResetPassword ? '비밀번호 찾기' : '로그인'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 lg:px-10 pb-8">
              <form
                onSubmit={handleSubmit(
                  isResetPassword ? handleResetPassword : handleLogin,
                  focusFirstError
                )}
                noValidate
                className="space-y-6"
              >
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-medium">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    className="w-full h-12 text-base"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    {...register('email', {
                      required: '이메일을 입력해주세요.',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: '올바른 이메일 주소를 입력해주세요.',
                      },
                    })}
                  />
                  {errors.email && (
                    <p
                      id="email-error"
                      role="alert"
                      className="flex items-center text-sm text-destructive"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                      {errors.email.message}
                    </p>
                  )}
                </div>
                {!isResetPassword && (
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium">비밀번호</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      className="w-full h-12 text-base"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      {...register('password', {
                        required: '비밀번호를 입력해주세요.',
                        minLength: {
                          value: 6,
                          message: '비밀번호는 최소 6자 이상이어야 합니다.',
                        },
                      })}
                    />
                    {errors.password && (
                      <p
                        id="password-error"
                        role="alert"
                        className="flex items-center text-sm text-destructive"
                      >
                        <AlertCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-12 touch-friendly text-base font-medium"
                  disabled={loading}
                >
                  {loading ? '처리중...' : (isResetPassword ? '비밀번호 재설정 이메일 발송' : '로그인')}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <Button
                  variant="link"
                  className="touch-friendly text-base"
                  onClick={() => setIsResetPassword(!isResetPassword)}
                >
                  {isResetPassword ? '로그인으로 돌아가기' : '비밀번호를 잊으셨나요?'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;