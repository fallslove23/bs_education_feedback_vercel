import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  SessionOption,  // Changed from CourseOption
  CourseReportStatisticsResponse,
} from '@/repositories/courseReportsRepositoryFixed';
import { CourseReportsRepositoryFixed } from '@/repositories/courseReportsRepositoryFixed';
import { useCourseReportStatistics } from '@/hooks/useCourseReportStatistics';

export interface UseCourseReportsDataResult {
  summary: CourseReportStatisticsResponse['summary'] | null;
  previousSummary: CourseReportStatisticsResponse['summary'] | null;
  trend: CourseReportStatisticsResponse['trend'];
  instructorStats: CourseReportStatisticsResponse['instructorStats'];
  previousInstructorStats: CourseReportStatisticsResponse['instructorStats'];
  textualResponses: CourseReportStatisticsResponse['textualResponses'];
  availableSessions: SessionOption[];  // Changed from availableCourses
  availableRounds: number[];
  availableInstructors: { id: string; name: string }[];
  loading: boolean;
  isInstructor: boolean;
  instructorId: string | null;
  instructorName: string | null;
  refetch: () => Promise<CourseReportStatisticsResponse | null>;
}

export const useCourseReportsData = (
  selectedYear: number,
  selectedSessionId: string,  // Changed from selectedCourse
  selectedRound: number | null,
  selectedInstructor: string,
  includeTestData = false
): UseCourseReportsDataResult => {
  const { toast } = useToast();
  const { user, userRoles } = useAuth();
  const isPrivileged = userRoles.includes('admin') || userRoles.includes('operator') || userRoles.includes('director');
  const isInstructor = userRoles.includes('instructor') && !isPrivileged;

  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState<string | null>(null);
  const [instructorIdLoaded, setInstructorIdLoaded] = useState(false);
  const { data, loading, fetchStatistics } = useCourseReportStatistics();
  const [previousData, setPreviousData] = useState<CourseReportStatisticsResponse | null>(null);
  const [fallbackSessions, setFallbackSessions] = useState<SessionOption[]>([]);

  // Load instructor id for instructor role
  useEffect(() => {
    let isActive = true;

    const fetchInstructorId = async () => {
      if (!isInstructor) {
        if (isActive) {
          setInstructorId(null);
          setInstructorIdLoaded(true);
        }
        return;
      }

      if (isActive) {
        setInstructorIdLoaded(false);
      }

      if (!user?.email) {
        if (isActive) {
          setInstructorId(null);
          setInstructorIdLoaded(true);
        }
        return;
      }

      const { data: instructor, error } = await supabase
        .from('instructors')
        .select('id, name')
        .eq('email', user.email)
        .maybeSingle();

      if (!isActive) return;

      if (error) {
        console.error('Failed to fetch instructor id', error);
        toast({
          title: '오류',
          description: '강사 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
        setInstructorId(null);
      } else {
        setInstructorId(instructor?.id ?? null);
        setInstructorName(instructor?.name ?? null);
      }

      setInstructorIdLoaded(true);
    };

    fetchInstructorId();

    return () => {
      isActive = false;
    };
  }, [isInstructor, user?.email, toast]);

  const instructorFilter = isInstructor ? instructorId : (selectedInstructor || null);

  const refetch = useCallback(async () => {
    if (!selectedYear) return null;
    if (isInstructor && !instructorIdLoaded) return null; // wait until instructor id lookup completes

    try {
      // selectedSessionId can be empty for "전체 과정" (All Courses) view
      const sessionIdParam = selectedSessionId || null;

      const current = await fetchStatistics({
        year: selectedYear,
        sessionId: sessionIdParam,  // Can be null for year-wide view
        round: selectedRound ?? null,
        instructorId: instructorFilter,
        includeTestData,
      });

      if (current) {
        try {
          // 같은 프로그램의 이전 턴 세션 찾기
          const currentProgramName = current.summary.programName;
          const availableSessions = (current.availableSessions && current.availableSessions.length > 0)
            ? current.availableSessions
            : fallbackSessions;

          // 현재 회차 정보
          const currentRound = current.summary.educationRound;

          if (currentRound !== null && currentProgramName) {
            // 같은 프로그램의 이전 턴 찾기 (턴이 현재보다 작고 가장 큰 것)
            const previousSession = availableSessions
              .filter(s =>
                s.programName === currentProgramName &&
                s.turn < currentRound
              )
              .sort((a, b) => b.turn - a.turn)[0];

            if (previousSession) {
              console.log('🔍 Fetching previous session data:', {
                currentProgram: currentProgramName,
                currentRound: currentRound,
                previousSessionId: previousSession.sessionId,
                previousTurn: previousSession.turn,
                previousSessionTitle: previousSession.sessionTitle
              });

              const previous = await CourseReportsRepositoryFixed.fetchStatistics({
                year: selectedYear,
                sessionId: previousSession.sessionId,  // 이전 턴의 세션 ID 사용
                round: null,  // 세션 ID로 필터링하므로 회차는 불필요
                instructorId: instructorFilter,
                includeTestData,
              });

              console.log('📊 Previous data fetched:', {
                hasSummary: !!previous?.summary,
                instructorStatsCount: previous?.instructorStats?.length ?? 0
              });
              setPreviousData(previous);
            } else {
              console.log('⚠️ No previous session found for program:', currentProgramName);
              setPreviousData(null);
            }
          } else {
            console.log('⚠️ No current round or program name');
            setPreviousData(null);
          }
        } catch (prevError) {
          console.error('Failed to fetch previous statistics', prevError);
          setPreviousData(null);
        }
      } else {
        setPreviousData(null);
      }

      return current;
    } catch (error) {
      console.error('Failed to load course report statistics', error);
      toast({
        title: '오류',
        description: '과정 보고서를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  }, [
    fetchStatistics,
    includeTestData,
    instructorFilter,
    isInstructor,
    instructorIdLoaded,
    selectedSessionId,  // Changed from selectedCourse
    selectedRound,
    selectedYear,
    toast,
    fallbackSessions,
  ]);

  useEffect(() => {
    if (!selectedYear) return;
    if (isInstructor && !instructorIdLoaded) return;
    refetch();
  }, [
    refetch,
    selectedYear,
    selectedSessionId,  // Changed from selectedCourse
    selectedRound,
    instructorFilter,
    includeTestData,
    isInstructor,
    instructorId,
    instructorIdLoaded,
  ]);

  // Load available sessions when no session is selected to avoid RPC error
  useEffect(() => {
    const loadSessions = async () => {
      if (!selectedYear || selectedSessionId) return;
      const { data, error } = await (supabase as any)
        .from('program_sessions_v1')
        .select('session_id, session_title, program, turn, year')
        .eq('year', selectedYear)
        .order('program', { ascending: true })
        .order('turn', { ascending: true });
      if (error) {
        console.error('Failed to load available sessions', error);
        setFallbackSessions([]);
        return;
      }
      const mapped: SessionOption[] = (data || []).map((d: any) => ({
        sessionId: d.session_id,
        displayName: `${d.program ?? ''} ${d.turn ?? ''}회차 - ${d.session_title ?? ''}`.trim(),
        sessionTitle: d.session_title ?? '',
        programName: d.program ?? '',
        turn: d.turn ?? 0,
      }));
      setFallbackSessions(mapped);
    };
    loadSessions();
  }, [selectedYear, selectedSessionId]);

  const availableSessions = data?.availableSessions ?? fallbackSessions;  // Changed from availableCourses

  const availableRounds = useMemo(() => {
    if (!data) return [];
    // For sessions, we can derive rounds from availableRounds in summary
    return data.summary.availableRounds ?? [];
  }, [data]);

  return {
    summary: data?.summary ?? null,
    previousSummary: previousData?.summary ?? null,
    trend: data?.trend ?? [],
    instructorStats: data?.instructorStats ?? [],
    previousInstructorStats: previousData?.instructorStats ?? [],
    textualResponses: data?.textualResponses ?? [],
    availableSessions,  // Changed from availableCourses
    availableRounds,
    availableInstructors: data?.availableInstructors ?? [],
    loading,
    isInstructor,
    instructorId,
    instructorName: instructorName,
    refetch,
  };
};
