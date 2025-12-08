import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshRequest {
  dryRun?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting dashboard cache refresh...');
    
    // Initialize Supabase client with service role key for elevated permissions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { dryRun = false }: RefreshRequest = req.method === 'POST' ? await req.json() : {};

    if (dryRun) {
      console.log('Dry run mode - checking materialized view status');
      
      // Check materialized view sizes and last refresh
      const { data: viewStats, error: statsError } = await supabase
        .rpc('pg_size_pretty', { bytes: 'pg_total_relation_size(\'public.mv_survey_stats\')' });
      
      if (statsError) {
        console.error('Error checking view stats:', statsError);
      }
      
      return new Response(JSON.stringify({
        status: 'dry_run_complete',
        timestamp: new Date().toISOString(),
        message: 'Materialized views status checked',
        view_stats: viewStats
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Refreshing materialized views...');
    
    // Call the refresh function
    const { error: refreshError } = await supabase
      .rpc('refresh_dashboard_materialized_views');

    if (refreshError) {
      console.error('Error refreshing materialized views:', refreshError);
      throw new Error(`Materialized view refresh failed: ${refreshError.message}`);
    }

    console.log('Materialized views refreshed successfully');

    // Get basic stats after refresh
    const { data: surveyStats, error: surveyError } = await supabase
      .from('mv_survey_stats')
      .select('survey_id', { count: 'exact', head: true });

    const { data: instructorStats, error: instructorError } = await supabase
      .from('mv_instructor_satisfaction')  
      .select('instructor_id', { count: 'exact', head: true });

    if (surveyError || instructorError) {
      console.error('Error getting post-refresh stats:', { surveyError, instructorError });
    }

    const result = {
      status: 'success',
      timestamp: new Date().toISOString(),
      message: 'Dashboard cache refreshed successfully',
      stats: {
        survey_stats_count: surveyStats?.length || 0,
        instructor_stats_count: instructorStats?.length || 0
      }
    };

    console.log('Cache refresh completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in refresh-dashboard-cache function:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);