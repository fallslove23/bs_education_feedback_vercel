import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateShortUrlRequest {
  surveyId: string;
  originalUrl?: string;
  expiresInDays?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔗 짧은 URL 생성 요청 받음')

    // 요청 본문 파싱
    const { surveyId, originalUrl, expiresInDays = 30 }: CreateShortUrlRequest = await req.json()

    if (!surveyId) {
      return new Response(
        JSON.stringify({ error: '설문 ID가 필요합니다' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 요청을 보낸 앱의 오리진 우선 사용 (없으면 함수 오리진)
    const requestOrigin = req.headers.get('origin')
      || (originalUrl ? new URL(originalUrl).origin : null)
      || new URL(req.url).origin

    console.log('📝 입력 데이터:', { surveyId, originalUrl, expiresInDays, requestOrigin })

    // 설문이 존재하는지 확인
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title, status')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      console.error('❌ 설문 조회 실패:', surveyError)
      return new Response(
        JSON.stringify({ error: '설문을 찾을 수 없습니다' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ 설문 확인됨:', survey.title)

    // 기존 짧은 URL이 있는지 확인
    const { data: existingShortUrl } = await supabase
      .from('short_urls')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('is_active', true)
      .single()

    if (existingShortUrl) {
      console.log('🔄 기존 짧은 URL 반환:', existingShortUrl.short_code)
      const shortUrl = `${requestOrigin}/s/${existingShortUrl.short_code}`
      
      return new Response(
        JSON.stringify({
          success: true,
          shortUrl,
          shortCode: existingShortUrl.short_code,
          originalUrl: existingShortUrl.original_url,
          clickCount: existingShortUrl.click_count,
          expiresAt: existingShortUrl.expires_at
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 원본 URL 설정 (제공되지 않은 경우 기본값 사용)
    const finalOriginalUrl = originalUrl || `${requestOrigin}/survey/${surveyId}`

    // 짧은 코드 생성
    const { data: shortCodeData, error: codeError } = await supabase
      .rpc('generate_short_code', { length: 6 })

    if (codeError || !shortCodeData) {
      console.error('❌ 짧은 코드 생성 실패:', codeError)
      return new Response(
        JSON.stringify({ error: '짧은 코드 생성에 실패했습니다' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const shortCode = shortCodeData
    console.log('🎲 생성된 짧은 코드:', shortCode)

    // 만료 날짜 계산
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // 짧은 URL 데이터베이스에 저장
    const { data: shortUrlData, error: insertError } = await supabase
      .from('short_urls')
      .insert({
        short_code: shortCode,
        original_url: finalOriginalUrl,
        survey_id: surveyId,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        click_count: 0
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ 짧은 URL 저장 실패:', insertError)
      return new Response(
        JSON.stringify({ error: '짧은 URL 저장에 실패했습니다' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ 짧은 URL 생성 완료:', shortUrlData)

    const shortUrl = `${requestOrigin}/s/${shortCode}`

    return new Response(
      JSON.stringify({
        success: true,
        shortUrl,
        shortCode,
        originalUrl: finalOriginalUrl,
        clickCount: 0,
        expiresAt: expiresAt.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 짧은 URL 생성 중 오류:', error)
    return new Response(
      JSON.stringify({ 
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})