import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateInstructorUsersRequest {
  instructors: {
    id: string;
    name: string;
    email: string;
  }[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instructors }: CreateInstructorUsersRequest = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results: Array<{
      instructor_id: string;
      name: string;
      email: string;
      status: 'success' | 'error';
      message: string;
      user_id?: string;
      email_sent?: boolean;
      email_error?: string;
    }> = [];
    const emailPromises = [];
    const FROM_ADDRESS = Deno.env.get("RESEND_FROM_ADDRESS") ?? "onboarding@resend.dev";

    for (const instructor of instructors) {
      try {
        // Update instructor with email
        const { error: updateError } = await supabaseClient
          .from('instructors')
          .update({ email: instructor.email })
          .eq('id', instructor.id);

        if (updateError) {
          throw updateError;
        }

        // Create user account using admin API
        const { data: user, error: createUserError } = await supabaseClient.auth.admin.createUser({
          email: instructor.email,
          password: 'bsedu123', // Default password
          email_confirm: true,
          user_metadata: {
            name: instructor.name,
            instructor_id: instructor.id
          }
        });

        if (createUserError) {
          throw createUserError;
        }

        // Send welcome email
        const emailPromise = resend.emails.send({
          from: FROM_ADDRESS,
          to: [instructor.email],
          subject: "설문 시스템 계정 생성 완료",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">🎉 계정 생성 완료</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">BS교육원 설문 시스템</p>
              </div>
              
              <!-- Welcome Message -->
              <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <h2 style="color: #047857; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">안녕하세요, ${instructor.name} 강사님!</h2>
                <p style="color: #374151; margin: 0; font-size: 16px; line-height: 1.6;">
                  BS교육원 설문 시스템 계정이 성공적으로 생성되었습니다. 이제 시스템에 로그인하여 설문 결과를 확인하고 관리하실 수 있습니다.
                </p>
              </div>

              <!-- Login Info -->
              <div style="background-color: #eff6ff; padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1e40af; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">🔑 로그인 정보</h3>
                <div style="background-color: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <div style="margin-bottom: 12px;">
                    <span style="color: #6b7280; font-weight: 500; display: inline-block; width: 80px;">이메일:</span>
                    <span style="color: #1f2937; font-weight: 600; font-family: monospace;">${instructor.email}</span>
                  </div>
                  <div>
                    <span style="color: #6b7280; font-weight: 500; display: inline-block; width: 80px;">비밀번호:</span>
                    <span style="color: #1f2937; font-weight: 600; font-family: monospace;">bsedu123</span>
                  </div>
                </div>
              </div>

              <!-- Instructions -->
              <div style="background-color: #fef3c7; padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">📝 사용 방법</h3>
                <ol style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li style="margin-bottom: 8px;">설문 시스템 웹사이트에 접속해 주세요</li>
                  <li style="margin-bottom: 8px;">위의 이메일과 비밀번호로 로그인하세요</li>
                  <li style="margin-bottom: 8px;">첫 로그인 후 비밀번호를 변경해 주세요</li>
                  <li>설문 결과를 확인하고 분석해 보세요</li>
                </ol>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; color: #dc2626; font-size: 14px;">
                  <strong>⚠️ 보안 안내:</strong> 로그인 후 반드시 비밀번호를 변경해 주세요. 계정 정보는 타인과 공유하지 마세요.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                  문의사항이 있으시면 시스템 관리자에게 연락해 주세요.
                </p>
                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                  BS교육원 설문 시스템 | 자동 발송 메일
                </p>
              </div>
            </div>
          `,
        });

        emailPromises.push(emailPromise);

        results.push({
          instructor_id: instructor.id,
          name: instructor.name,
          email: instructor.email,
          user_id: user.user?.id,
          status: 'success',
          message: 'Instructor account created and email queued successfully'
        });

      } catch (error) {
        console.error(`Error processing instructor ${instructor.name}:`, error);
        results.push({
          instructor_id: instructor.id,
          name: instructor.name,
          email: instructor.email,
          status: 'error',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Wait for all emails to be sent
    const emailResults = await Promise.allSettled(emailPromises);
    
    // Update results with email status
    emailResults.forEach((result, index) => {
      const successResults = results.filter(r => r.status === 'success');
      if (successResults[index]) {
        if (result.status === 'fulfilled') {
          successResults[index].email_sent = true;
        } else {
          successResults[index].email_sent = false;
          successResults[index].email_error = result.reason?.message || 'Email send failed';
        }
      }
    });

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'error').length;

    return new Response(
      JSON.stringify({
        success: true,
        total: instructors.length,
        processed: successCount,
        failed: failureCount,
        results
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-instructor-users function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);