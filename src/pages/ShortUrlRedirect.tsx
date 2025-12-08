import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LoadingScreen from '@/components/LoadingScreen';
import SupportContactInfo, {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_SURVEY_CONTACT,
} from '@/components/SupportContactInfo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ShortUrlRedirect = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!shortCode) {
        setError('잘못된 링크입니다');
        setLoading(false);
        return;
      }

      try {
        console.log('🔗 짧은 URL 리다이렉트 처리:', shortCode);

        // 짧은 URL 정보 조회
        const { data: shortUrlData, error: fetchError } = await supabase
          .from('short_urls')
          .select('*')
          .eq('short_code', shortCode)
          .eq('is_active', true)
          .single();

        if (fetchError || !shortUrlData) {
          console.error('❌ 짧은 URL 조회 실패:', fetchError);
          setError('존재하지 않거나 비활성화된 링크입니다');
          setLoading(false);
          return;
        }

        // 만료 확인
        if (shortUrlData.expires_at && new Date(shortUrlData.expires_at) < new Date()) {
          console.error('⏰ 만료된 링크:', shortCode);
          setError('만료된 링크입니다');
          setLoading(false);
          return;
        }

        console.log('✅ 짧은 URL 정보 확인됨:', shortUrlData);

        // 클릭 수 증가
        try {
          await supabase
            .from('short_urls')
            .update({ click_count: shortUrlData.click_count + 1 })
            .eq('id', shortUrlData.id);
          
          console.log('📊 클릭 수 업데이트 완료');
        } catch (updateError) {
          // 클릭 수 업데이트 실패는 리다이렉트를 막지 않음
          console.warn('⚠️ 클릭 수 업데이트 실패:', updateError);
        }

        // 원본 URL로 리다이렉트
        console.log('🎯 리다이렉트 대상:', shortUrlData.original_url);
        
        // 내부 경로인 경우 navigate 사용, 외부 URL인 경우 window.location 사용
        if (shortUrlData.original_url.startsWith('/')) {
          navigate(shortUrlData.original_url);
        } else if (shortUrlData.original_url.includes(window.location.host)) {
          // 같은 도메인인 경우 내부 경로 추출
          const url = new URL(shortUrlData.original_url);
          navigate(url.pathname + url.search + url.hash);
        } else {
          // 외부 URL인 경우
          window.location.href = shortUrlData.original_url;
        }

      } catch (error) {
        console.error('💥 리다이렉트 처리 중 오류:', error);
        setError('링크 처리 중 오류가 발생했습니다');
        setLoading(false);
      }
    };

    handleRedirect();
  }, [shortCode, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    const handleClose = () => navigate('/');

    return (
      <div className="min-h-screen bg-background">
        <Dialog open onOpenChange={(open) => !open && handleClose()}>
          <DialogContent className="sm:max-w-md space-y-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogHeader className="space-y-2 text-center">
                <DialogTitle className="text-xl font-semibold">링크 오류</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {error}
                </DialogDescription>
              </DialogHeader>
            </div>

            <SupportContactInfo
              adminEmail={DEFAULT_ADMIN_EMAIL}
              surveyContact={DEFAULT_SURVEY_CONTACT}
              className="border-0 bg-muted/20"
            />

            <DialogFooter className="sm:justify-center">
              <Button onClick={handleClose} className="w-full sm:w-auto">
                홈으로 돌아가기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return <LoadingScreen />;
};

export default ShortUrlRedirect;