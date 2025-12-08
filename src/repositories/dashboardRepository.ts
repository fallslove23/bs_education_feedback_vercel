import { supabase } from '@/integrations/supabase/client';

export interface DashboardCounts {
  survey_count: number;
  respondent_count: number;
  instructor_count: number;
  avg_score: number | null;
}

// Raw RPC response may have different field names (legacy compatibility)
interface RawDashboardCounts {
  survey_count?: number;
  respondent_count?: number;
  respondent_cc?: number; // Legacy field name
  instructor_count?: number;
  instructor_cc?: number; // Legacy field name
  avg_score?: number | null;
}

// Normalize RPC response to standard field names
function normalizeDashboardCounts(raw: RawDashboardCounts | null | undefined): DashboardCounts {
  if (!raw) {
    return {
      survey_count: 0,
      respondent_count: 0,
      instructor_count: 0,
      avg_score: null,
    };
  }

  return {
    survey_count: raw.survey_count ?? 0,
    respondent_count: raw.respondent_count ?? raw.respondent_cc ?? 0,
    instructor_count: raw.instructor_count ?? raw.instructor_cc ?? 0,
    avg_score: (typeof raw.avg_score === 'number' && Number.isFinite(raw.avg_score)) 
      ? raw.avg_score 
      : null,
  };
}

/**
 * Fetch dashboard summary counts using RPC
 * @param year - Education year (nullable)
 * @param sessionKey - Optional session_key UUID to filter by specific course/session
 */
export async function fetchDashboardCounts(
  year: number | null,
  sessionKey?: string | null
): Promise<DashboardCounts> {
  try {
    // Convert sessionKey to UUID if provided, otherwise pass null
    let sessionIdParam: string | null = null;
    if (sessionKey && sessionKey.trim() !== '') {
      sessionIdParam = sessionKey;
    }

    const { data, error } = await supabase.rpc('rpc_dashboard_counts' as any, {
      p_year: year ?? null,
      p_session_id: sessionIdParam,
    }) as { data: RawDashboardCounts[] | null; error: any };

    if (error) {
      console.error('RPC error in fetchDashboardCounts:', error);
      throw error;
    }

    // RPC returns array with single row - normalize field names
    const rawResult = data?.[0];
    const result = normalizeDashboardCounts(rawResult);

    console.log('📊 Dashboard counts normalized:', { raw: rawResult, normalized: result, sessionId: sessionIdParam });
    return result;
  } catch (error) {
    console.error('Error in fetchDashboardCounts:', error);
    // Fail-safe: return zeros via normalizer
    return normalizeDashboardCounts(null);
  }
}
