import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRoles: string[];
  instructorId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [instructorId, setInstructorId] = useState<string | null>(null);

  // 역할 우선순위 정의 (instructor가 최하위)
  const getRolePriority = (role: string): number => {
    const priorities: Record<string, number> = {
      admin: 1,
      operator: 2,
      director: 3,
      instructor: 4, // 가장 낮은 우선순위
    };
    return priorities[role] || 99;
  };

  // 사용자 역할 및 강사 ID 가져오기 함수
  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_roles', { target_user_id: userId });
      if (!error && data) {
        const roles = data.map((item: any) => item.role);
        // 역할 우선순위로 정렬 (instructor를 맨 뒤로)
        const sortedRoles = roles.sort((a: string, b: string) => getRolePriority(a) - getRolePriority(b));
        setUserRoles(sortedRoles);
      }
      
      // 강사 ID 가져오기
      const { data: instructorData } = await supabase
        .from('instructors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      setInstructorId(instructorData?.id ?? null);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles([]);
      setInstructorId(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // 역할 정보를 비동기로 가져오기
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setUserRoles([]);
        }
        setLoading(false);
      }
    );

    // Check for existing session first
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRoles(session.user.id);
      }
      setLoading(false);
    };

    checkExistingSession();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // 상태 정리
      setUserRoles([]);
      setInstructorId(null);
      setUser(null);
      setSession(null);
      
      // 로컬 스토리지에서 Supabase 인증 키만 정리 (익명 설문 세션 등은 유지)
      const ANON_KEY = 'bs-feedback-anon-session';
      const preserveAnon = localStorage.getItem(ANON_KEY);

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        const isSupabaseKey = key.startsWith('sb-') || key.startsWith('supabase.');
        if (isSupabaseKey && key !== ANON_KEY) {
          localStorage.removeItem(key);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (!key) continue;
        const isSupabaseKey = key.startsWith('sb-') || key.startsWith('supabase.');
        if (isSupabaseKey) {
          sessionStorage.removeItem(key);
        }
      }
      // 혹시 브라우저가 삭제했을 수 있으니 익명 세션 키 복구
      if (preserveAnon && !localStorage.getItem(ANON_KEY)) {
        localStorage.setItem(ANON_KEY, preserveAnon);
      }
      
      // Supabase 로그아웃
      await supabase.auth.signOut({ scope: 'global' });
      
      // 강제 리디렉션
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
      // 오류가 발생해도 로컬 상태는 정리하고 리디렉션
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRoles, instructorId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};