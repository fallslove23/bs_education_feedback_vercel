// src/hooks/useAnonymousSession.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ✅ 스키마(테이블) 의존성 제거 버전
export function useAnonymousSession() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        // 익명 설문은 별도의 인증 없이 anon 키로만 접근
        setSession(data.session ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ✅ 세션 없이도 동작: 로컬스토리지로 "이미 참여" 판단
  const lsKey = (surveyId: string) => `survey_completed_${surveyId}`;

  const checkSurveyCompletion = useCallback(async (surveyId: string) => {
    try {
      return localStorage.getItem(lsKey(surveyId)) === '1';
    } catch {
      return false;
    }
  }, []);

  const markSurveyCompleted = useCallback(async (surveyId: string) => {
    try {
      localStorage.setItem(lsKey(surveyId), '1');
    } catch {
      /* noop */
    }
  }, []);

  // ✅ 토큰은 선택 사항: 코드가 있으면 true 정도만 반환(검증을 강하게 하고 싶으면 추후 서버 로직 추가)
  const validateToken = useCallback(async (_surveyId: string, code: string) => {
    return !!code?.trim();
  }, []);

  return { session, loading, checkSurveyCompletion, markSurveyCompleted, validateToken };
}