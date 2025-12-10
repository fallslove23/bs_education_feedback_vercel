import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendResultsRequest {
  surveyId: string;
  recipients: string[];
  force?: boolean;
  previewOnly?: boolean;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr.map((x) => JSON.stringify(x)))).map((s) => JSON.parse(s));
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { surveyId, recipients = [], previewOnly }: SendResultsRequest = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1) Survey
    const { data: survey, error: surveyErr } = await supabase
      .from("surveys")
      .select("*")
      .eq("id", surveyId)
      .single();
    if (surveyErr || !survey) throw new Error("Survey not found");

    // 2) Sessions + instructors
    const { data: sessions, error: sessErr } = await supabase
      .from("survey_sessions")
      .select(`id, session_name, instructor_id, instructors (id, name, email)`) // ensure FK exists
      .eq("survey_id", surveyId);
    if (sessErr) throw new Error("Failed to fetch sessions");

    const sessionIdToInstructorId = new Map<string, string>();
    const sessionIdToInstructorName = new Map<string, string>();
    const sessionIdToSessionName = new Map<string, string>();
    const instructorsFromSessions: Array<{ id: string; name?: string; email?: string }> = [];
    sessions?.forEach((s: any) => {
      if (s?.id && s?.instructor_id) sessionIdToInstructorId.set(s.id, s.instructor_id);
      if (s?.id && s?.instructors?.name) sessionIdToInstructorName.set(s.id, s.instructors.name);
      if (s?.id && s?.session_name) sessionIdToSessionName.set(s.id, s.session_name);
      if (s?.instructors?.id && !instructorsFromSessions.find((i) => i.id === s.instructors.id)) {
        instructorsFromSessions.push({ id: s.instructors.id, name: s.instructors.name, email: s.instructors.email });
      }
    });

    // 3) Extra instructors
    const extraInstructors: Array<{ id: string; name?: string; email?: string }> = [];
    if (survey.instructor_id) {
      const { data: inst } = await supabase
        .from("instructors")
        .select("id, name, email")
        .eq("id", survey.instructor_id)
        .single();
      if (inst) extraInstructors.push(inst as any);
    }
    const { data: surveyInstructors } = await supabase
      .from("survey_instructors")
      .select(`instructor_id, instructors (id, name, email)`) // mapping
      .eq("survey_id", surveyId);
    surveyInstructors?.forEach((si: any) => {
      const inst = si?.instructors;
      if (inst && !extraInstructors.find((i) => i.id === inst.id)) extraInstructors.push(inst);
    });

    const allInstructors = uniq([...instructorsFromSessions, ...extraInstructors]);

    // 4) Responses (no nested)
    const { data: responses, error: respErr } = await supabase
      .from("survey_responses")
      .select("id, session_id, submitted_at, is_test")
      .eq("survey_id", surveyId)
      .neq("is_test", true);
    if (respErr) throw new Error("Failed to fetch survey responses");
    if (!responses || responses.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "응답이 없는 설문입니다. 이메일을 발송하지 않습니다.", responseCount: 0 }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const responseIds = responses.map((r: any) => r.id);

    // 5) Answers + questions
    const { data: answers, error: ansErr } = await supabase
      .from("question_answers")
      .select(`id, response_id, question_id, answer_text, answer_value,
               survey_questions (id, question_text, question_type, satisfaction_type, session_id)`)
      .in("response_id", responseIds);
    if (ansErr) throw new Error("Failed to fetch answers");

    const emailToInstructorId = new Map<string, string>();
    allInstructors.forEach((inst) => {
      if (inst.email) emailToInstructorId.set(String(inst.email).toLowerCase(), inst.id);
    });

    // 각 이메일의 역할을 확인하는 맵 추가
    const emailToRole = new Map<string, string>();

    // profiles 테이블에서 모든 사용자 정보 가져오기
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email, instructor_id')
      .not('email', 'is', null);

    if (allProfiles) {
      for (const profile of allProfiles) {
        const email = String(profile.email).toLowerCase();

        // instructor_id가 있으면 강사
        if (profile.instructor_id) {
          emailToRole.set(email, 'instructor');
          // instructor_id로 강사 맵핑도 추가
          if (!emailToInstructorId.has(email)) {
            emailToInstructorId.set(email, profile.instructor_id);
          }
        }
      }
    }

    // user_roles에서 각 사용자의 역할 가져오기
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (userRoles) {
      const userIdToRole = new Map<string, string[]>();
      userRoles.forEach((ur: any) => {
        const roles = userIdToRole.get(ur.user_id) || [];
        roles.push(ur.role);
        userIdToRole.set(ur.user_id, roles);
      });

      // profiles와 조인하여 이메일-역할 매핑
      if (allProfiles) {
        for (const profile of allProfiles) {
          const roles = userIdToRole.get(profile.id);
          if (roles && roles.length > 0) {
            const email = String(profile.email).toLowerCase();
            // director나 admin 역할이 있으면 우선 적용
            if (roles.includes('director') || roles.includes('admin')) {
              emailToRole.set(email, roles.includes('director') ? 'director' : 'admin');
            } else if (!emailToRole.has(email)) {
              // 그 외 역할 (operator 등)
              emailToRole.set(email, roles[0]);
            }
          }
        }
      }
    }

    const buildContent = (targetInstructorId: string | null) => {
      let filteredResponseIds = new Set<string>(responseIds);
      if (targetInstructorId) {
        const sessionIds = Array.from(sessionIdToInstructorId.entries())
          .filter(([_, iid]) => iid === targetInstructorId)
          .map(([sid]) => sid);
        filteredResponseIds = new Set(
          responses.filter((r: any) => r.session_id && sessionIds.includes(r.session_id)).map((r: any) => r.id)
        );
      }

      const totalResponses = filteredResponseIds.size;
      const filteredAnswers = answers?.filter((a: any) => filteredResponseIds.has(a.response_id)) || [];

      const qaMap: Record<string, any> = {};
      filteredAnswers.forEach((a: any) => {
        const q = a.survey_questions || {};
        const qid = a.question_id;
        if (!qaMap[qid]) {
          const sessId = q.session_id || null;
          const instructorIdForQuestion = sessId ? sessionIdToInstructorId.get(sessId) || null : null;
          qaMap[qid] = {
            question: q.question_text,
            type: q.question_type,
            satisfaction_type: q.satisfaction_type,
            sessionId: sessId,
            sessionName: sessId ? sessionIdToSessionName.get(sessId) || null : null,
            instructor: sessId ? sessionIdToInstructorName.get(sessId) || null : null,
            instructorId: instructorIdForQuestion,
            answers: [] as any[],
            stats: {},
          };
        }
        const row = qaMap[qid];
        const val = a.answer_value;
        const text = a.answer_text;
        if (row.type === "rating" || row.type === "scale") {
          let n: number | null = null;
          if (typeof val === "number") n = val;
          else if (typeof val === "string" && !isNaN(Number(val))) n = Number(val);
          else if (val && typeof val === "object") {
            const maybe: any = (val as any).value ?? (val as any).score ?? null;
            if (maybe != null && !isNaN(Number(maybe))) n = Number(maybe);
          } else if (typeof text === "string" && !isNaN(Number(text))) {
            n = Number(text);
          }
          if (typeof n === "number" && !isNaN(n)) row.answers.push(n);
        } else if (row.type === "multiple_choice" || row.type === "single_choice") {
          const pushChoice = (s: any) => {
            if (s == null) return;
            const v = typeof s === "object" ? (s.label ?? s.value ?? JSON.stringify(s)) : s;
            const str = String(v).trim();
            if (str) row.answers.push(str);
          };
          if (typeof text === "string" && text.trim()) pushChoice(text);
          else if (Array.isArray(val)) val.forEach(pushChoice);
          else if (typeof val === "string") pushChoice(val);
          else if (typeof val === "object" && val) pushChoice(val);
        } else if (typeof text === "string" && text.trim()) {
          row.answers.push(text.trim());
        }
      });

      Object.keys(qaMap).forEach((k) => {
        const row = qaMap[k];
        if (row.type === "rating" || row.type === "scale") {
          const nums = row.answers.filter((x: any) => typeof x === "number" && !isNaN(x));
          if (nums.length > 0) {
            const avg = nums.reduce((s: number, v: number) => s + v, 0) / nums.length;
            row.stats.average = Number(avg.toFixed(1));
            row.stats.count = nums.length;
          }
        } else if (row.type === "multiple_choice" || row.type === "single_choice") {
          const counts: Record<string, number> = {};
          row.answers.forEach((v: any) => {
            const key = String(v);
            counts[key] = (counts[key] || 0) + 1;
          });
          row.stats.distribution = counts;
        }
      });

      // satisfaction_type별로 만족도 계산
      const ratingRows = Object.values(qaMap).filter((r: any) => r.type === "rating" || r.type === "scale");

      const calculateTypeSatisfaction = (satisfactionType: string | null) => {
        const filtered = satisfactionType
          ? ratingRows.filter((r: any) => r.satisfaction_type === satisfactionType)
          : ratingRows;
        const all = filtered.flatMap((r: any) => r.answers.filter((x: any) => typeof x === "number" && !isNaN(x)));
        return all.length > 0 ? Number((all.reduce((s: number, v: number) => s + v, 0) / all.length).toFixed(1)) : null;
      };

      const avgInstructorSatisfaction = calculateTypeSatisfaction('instructor');
      const avgCourseSatisfaction = calculateTypeSatisfaction('course');
      const avgOperationSatisfaction = calculateTypeSatisfaction('operation');
      const avgOverallSatisfaction = calculateTypeSatisfaction(null);

      // 강사별 만족도 계산 (sessionId 기준으로)
      const sessionSatisfactionMap = new Map<string, { sessionName: string; instructorName: string; avg: number; count: number }>();
      ratingRows.forEach((r: any) => {
        if (r.satisfaction_type === 'instructor' && r.sessionId && r.answers.length > 0) {
          const nums = r.answers.filter((x: any) => typeof x === "number" && !isNaN(x));
          if (nums.length > 0) {
            const existing = sessionSatisfactionMap.get(r.sessionId);
            if (existing) {
              existing.avg = ((existing.avg * existing.count) + nums.reduce((s: number, v: number) => s + v, 0)) / (existing.count + nums.length);
              existing.count += nums.length;
            } else {
              const avg = nums.reduce((s: number, v: number) => s + v, 0) / nums.length;
              sessionSatisfactionMap.set(r.sessionId, {
                sessionName: r.sessionName || '과목 미정',
                instructorName: r.instructor || '미등록',
                avg,
                count: nums.length
              });
            }
          }
        }
      });

      let questionSummary = "";
      let lastSessionId: string | null = null;

      Object.values(qaMap).forEach((qa: any) => {
        // 세션(과목)이 바뀔 때 섹션 헤더 추가
        if (qa.sessionId && qa.sessionId !== lastSessionId) {
          const sessionSat = qa.sessionId ? sessionSatisfactionMap.get(qa.sessionId) : null;
          const responseCount = sessionSat ? sessionSat.count : 0;
          const responseRate = totalResponses > 0 ? ((responseCount / totalResponses) * 100).toFixed(1) : '0.0';

          const isLowSatisfaction = sessionSat && sessionSat.avg <= 6;
          // Gradient -> Solid color fallback for email
          const headerBgColor = isLowSatisfaction ? '#b91c1c' : '#4f46e5';
          const borderColor = isLowSatisfaction ? '#991b1b' : '#3730a3';
          const warningIcon = isLowSatisfaction ? '⚠️ ' : '';

          questionSummary += `
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px;margin-bottom:16px;background-color:${headerBgColor};border-radius:8px;overflow:hidden;">
              <tr>
                <td style="padding:16px 20px;border-left:4px solid ${borderColor};">
                  <h3 style="margin:0 0 8px 0;color:#ffffff;font-size:16px;font-weight:700;">
                    ${qa.sessionName || '과목 미정'} <span style="font-weight:400;opacity:0.8;margin:0 4px;">|</span> ${qa.instructor || '강사 미정'}
                  </h3>
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      ${sessionSat ? `
                      <td style="padding:4px 10px;background-color:#ffffff;border-radius:12px;color:${headerBgColor};font-size:12px;font-weight:700;margin-right:8px;">
                        ${warningIcon}만족도 ${sessionSat.avg.toFixed(1)}
                      </td>
                      <td width="8"></td>
                      ` : ''}
                      <td style="color:rgba(255,255,255,0.9);font-size:12px;">
                        응답 ${responseCount}명
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `;
          lastSessionId = qa.sessionId;
        }

        // Question Block
        questionSummary += `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;background-color:#ffffff;">
            <tr>
              <td style="padding:16px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;border-radius:8px 8px 0 0;">
                <h4 style="margin:0;color:#1e293b;font-size:14px;font-weight:600;line-height:1.5;">${qa.question}</h4>
              </td>
            </tr>
            <tr>
              <td style="padding:16px;">
        `;

        if (qa.stats.average) {
          questionSummary += `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size:14px;color:#475569;">
                  평균 점수: <strong style="color:#059669;font-size:16px;">${qa.stats.average}점</strong>
                  <span style="color:#94a3b8;font-size:12px;margin-left:4px;">(${qa.stats.count}명 응답)</span>
                </td>
              </tr>
            </table>
          `;
        } else if (qa.stats.distribution) {
          const totalCount = Object.values(qa.stats.distribution).reduce((sum: number, count: any) => sum + count, 0);
          questionSummary += '<table border="0" cellpadding="0" cellspacing="0" width="100%">';
          Object.entries(qa.stats.distribution).forEach(([option, count]) => {
            const percentage = totalCount > 0 ? ((count as number / totalCount) * 100).toFixed(1) : '0.0';
            const barWidth = totalCount > 0 ? Math.round((count as number / totalCount) * 100) : 0;
            questionSummary += `
              <tr>
                <td style="padding:6px 0;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="font-size:13px;color:#334155;padding-bottom:4px;">
                        <strong>${option}</strong>
                      </td>
                      <td align="right" style="font-size:13px;color:#64748b;padding-bottom:4px;">
                        ${count}명 (${percentage}%)
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="background-color:#e2e8f0;height:8px;border-radius:4px;overflow:hidden;">
                        <!-- Width bar using div inside table cell is strictly safe but table cell width is safer. Using div for bar is usually ok if height is set. -->
                        <div style="width:${barWidth}%;height:8px;background-color:#6366f1;"></div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            `;
          });
          questionSummary += '</table>';
        } else if ((qa.type === 'text' || qa.type === 'textarea') && qa.answers.length > 0) {
          questionSummary += `
            <div style="font-size:13px;color:#475569;">
              <div style="margin-bottom:12px;font-weight:600;">${qa.answers.length}건의 의견:</div>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
          `;
          qa.answers.forEach((answer: string, idx: number) => {
            questionSummary += `
              <tr>
                <td style="padding-bottom:8px;">
                  <div style="padding:10px;background-color:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0;">
                    <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">#${idx + 1}</div>
                    <div style="font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap;">${answer}</div>
                  </div>
                </td>
              </tr>`;
          });
          questionSummary += `</table></div>`;
        }
        questionSummary += `
              </td>
            </tr>
          </table>
        `;
      });

      const instructorNames = allInstructors.map((i) => i.name).filter(Boolean).join(", ") || "미등록";
      const emailSubject = `📊 설문 결과 발송: ${survey.title || survey.course_name || '설문'}`;

      // 이메일 템플릿 스타일 및 HTML 생성
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>설문 결과</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;padding:20px 0;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                  
                  <!-- 헤더 -->
                  <tr>
                    <td style="background-color:#6366f1;padding:30px 24px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">설문 결과 보고서</h1>
                      <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">${survey.title || survey.course_name || ''}</p>
                    </td>
                  </tr>

                  <!-- 설문 정보 요약 -->
                  <tr>
                    <td style="padding:24px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                        <tr>
                          <td style="padding:16px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td style="padding-bottom:8px;color:#64748b;font-size:13px;width:80px;">강사명</td>
                                <td style="padding-bottom:8px;color:#0f172a;font-size:14px;font-weight:600;">${instructorNames}</td>
                              </tr>
                              <tr>
                                <td style="padding-bottom:8px;color:#64748b;font-size:13px;">교육년도</td>
                                <td style="padding-bottom:8px;color:#0f172a;font-size:14px;font-weight:600;">${survey.education_year ?? ''}년 (${survey.education_round ?? ''}차)</td>
                              </tr>
                              <tr>
                                <td style="color:#64748b;font-size:13px;">작성일</td>
                                <td style="color:#0f172a;font-size:14px;font-weight:600;">${new Date().toLocaleDateString('ko-KR')}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- 주요 지표 (Grid 대신 Table 사용) -->
                  <tr>
                    <td style="padding:0 24px 24px 24px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          ${avgInstructorSatisfaction !== null ? `
                          <td width="32%" style="padding-right:2%;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
                              <tr>
                                <td style="padding:16px;background-color:#ffffff;border-radius:8px;">
                                  <div style="font-size:24px;font-weight:800;color:#6366f1;margin-bottom:4px;">${avgInstructorSatisfaction}</div>
                                  <div style="font-size:12px;color:#64748b;font-weight:600;">강사 만족도</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                          ` : ''}
                          ${avgCourseSatisfaction !== null ? `
                          <td width="32%" style="padding-right:2%;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
                              <tr>
                                <td style="padding:16px;background-color:#ffffff;border-radius:8px;">
                                  <div style="font-size:24px;font-weight:800;color:#10b981;margin-bottom:4px;">${avgCourseSatisfaction}</div>
                                  <div style="font-size:12px;color:#64748b;font-weight:600;">과정 만족도</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                          ` : ''}
                          <td width="32%">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
                              <tr>
                                <td style="padding:16px;background-color:#ffffff;border-radius:8px;">
                                  <div style="font-size:24px;font-weight:800;color:#334155;margin-bottom:4px;">${filteredResponseIds.size}명</div>
                                  <div style="font-size:12px;color:#64748b;font-weight:600;">총 응답자</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- 구분선 -->
                  <tr>
                    <td style="padding:0 24px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="border-top:1px solid #e2e8f0;"></td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- 상세 분석 내용 -->
                  <tr>
                    <td style="padding:24px;">
                      <h2 style="margin:0 0 20px 0;font-size:18px;color:#1e293b;font-weight:700;">📝 상세 문항 분석</h2>
                      ${questionSummary}
                    </td>
                  </tr>

                  <!-- 푸터 -->
                  <tr>
                    <td style="background-color:#f1f5f9;padding:24px;text-align:center;">
                      <p style="margin:0 0 8px 0;color:#64748b;font-size:14px;font-weight:600;">BS Education Feedback System</p>
                      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">본 메일은 발신 전용입니다.<br>문의사항은 관리자에게 연락 바랍니다.</p>
                    </td>
                  </tr>

                </table>
                
                <!-- 하단 링크 -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin-top:20px;">
                  <tr>
                    <td align="center">
                      <a href="https://sseducationfeedback.info" style="color:#64748b;text-decoration:none;font-size:13px;border-bottom:1px solid #cbd5e1;">시스템 바로가기 &rarr;</a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      return { subject: emailSubject, html: emailHtml };
    };

    if (previewOnly) {
      // 미리보기: 역할을 실제 이메일로 확장
      const expandedEmails: string[] = [];

      for (const recipient of recipients) {
        const recipientStr = String(recipient).toLowerCase();

        // 역할인 경우 해당 역할의 모든 사용자 이메일을 가져옴 (admin 제외)
        if (['director', 'manager', 'instructor'].includes(recipientStr)) {
          if (recipientStr === 'instructor') {
            // 강사의 경우 이 설문에 연결된 강사의 이메일만 추가
            allInstructors.forEach((inst: any) => {
              if (inst.email) expandedEmails.push(inst.email);
            });
          } else {
            // 다른 역할들은 기존 로직대로
            // 1단계: user_roles에서 해당 역할의 user_id 가져오기
            const { data: userRoles } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', recipientStr);

            if (userRoles && userRoles.length > 0) {
              const userIds = userRoles.map((ur: any) => ur.user_id);

              // 2단계: profiles에서 해당 user_id들의 이메일 가져오기
              const { data: profiles } = await supabase
                .from('profiles')
                .select('email')
                .in('id', userIds)
                .not('email', 'is', null);

              if (profiles) {
                profiles.forEach((p: any) => {
                  if (p.email) expandedEmails.push(p.email);
                });
              }
            }
          }
        } else {
          // 이메일 주소인 경우 그대로 추가
          expandedEmails.push(recipient);
        }
      }

      // 중복 제거
      const uniqueEmails = Array.from(new Set(expandedEmails));

      // 미리보기: 수신자 중 강사 이메일이 있으면 해당 강사의 결과만 표시
      let previewInstructorId: string | null = null;

      for (const email of uniqueEmails) {
        const emailLower = email.toLowerCase();
        if (emailToInstructorId.has(emailLower)) {
          previewInstructorId = emailToInstructorId.get(emailLower) || null;
          break; // 첫 번째 강사의 결과를 미리보기로 사용
        }
      }

      const content = buildContent(previewInstructorId);
      return new Response(
        JSON.stringify({
          success: true,
          subject: content.subject,
          htmlContent: content.html,
          recipients: uniqueEmails,
          previewNote: previewInstructorId
            ? "미리보기: 강사님께는 본인의 과목 결과만 전송됩니다."
            : "미리보기: 전체 결과가 표시됩니다."
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prepare survey info and question analysis for email logs
    const surveyInfo = {
      year: survey.education_year,
      round: survey.education_round,
      title: survey.title || survey.course_name,
      course: survey.course_name,
      instructor: allInstructors.map((i) => i.name).filter(Boolean).join(", ") || "미등록",
      author_name: survey.created_by_name || "Unknown",
      author_email: survey.created_by_email || "Unknown",
      response_count: responses.length,
    };

    // Build question analysis from all answers for logging
    const logQaMap: Record<string, any> = {};
    answers?.forEach((a: any) => {
      const q = a.survey_questions || {};
      const qid = a.question_id;
      if (!logQaMap[qid]) {
        logQaMap[qid] = {
          question: q.question_text,
          type: q.question_type,
          satisfaction_type: q.satisfaction_type,
          answers: [] as any[],
          stats: {},
        };
      }
      const row = logQaMap[qid];
      const val = a.answer_value;
      const text = a.answer_text;
      if (row.type === "rating" || row.type === "scale") {
        let n: number | null = null;
        if (typeof val === "number") n = val;
        else if (typeof val === "string" && !isNaN(Number(val))) n = Number(val);
        else if (val && typeof val === "object") {
          const maybe: any = (val as any).value ?? (val as any).score ?? null;
          if (maybe != null && !isNaN(Number(maybe))) n = Number(maybe);
        } else if (typeof text === "string" && !isNaN(Number(text))) {
          n = Number(text);
        }
        if (typeof n === "number" && !isNaN(n)) row.answers.push(n);
      } else if (row.type === "multiple_choice" || row.type === "single_choice") {
        const pushChoice = (s: any) => {
          if (s == null) return;
          const v = typeof s === "object" ? (s.label ?? s.value ?? JSON.stringify(s)) : s;
          const str = String(v).trim();
          if (str) row.answers.push(str);
        };
        if (typeof text === "string" && text.trim()) pushChoice(text);
        else if (Array.isArray(val)) val.forEach(pushChoice);
        else if (typeof val === "string") pushChoice(val);
        else if (typeof val === "object" && val) pushChoice(val);
      } else if (typeof text === "string" && text.trim()) {
        row.answers.push(text.trim());
      }
    });

    // Calculate stats for each question
    Object.keys(logQaMap).forEach((k) => {
      const row = logQaMap[k];
      if (row.type === "rating" || row.type === "scale") {
        const nums = row.answers.filter((x: any) => typeof x === "number" && !isNaN(x));
        if (nums.length > 0) {
          const avg = nums.reduce((s: number, v: number) => s + v, 0) / nums.length;
          row.stats.average = Number(avg.toFixed(1));
          row.stats.count = nums.length;
        }
      } else if (row.type === "multiple_choice" || row.type === "single_choice") {
        const counts: Record<string, number> = {};
        row.answers.forEach((v: any) => {
          const key = String(v);
          counts[key] = (counts[key] || 0) + 1;
        });
        row.stats.distribution = counts;
      }
    });

    const questionAnalysis = logQaMap;

    const results: any[] = [];
    const sentEmails = new Set<string>(); // 중복 발송 방지
    const recipientDetails: any[] = []; // 수신자 상세 정보 (로그용)

    for (const emailRaw of recipients) {
      const email = String(emailRaw).toLowerCase();

      // 역할인 경우 해당 역할의 모든 사용자 이메일로 확장 (admin 제외)
      let targetEmails: string[] = [];
      if (['director', 'manager', 'instructor'].includes(email)) {
        if (email === 'instructor') {
          // 강사의 경우 이 설문에 연결된 강사의 이메일만
          targetEmails = allInstructors.map((inst: any) => inst.email).filter(Boolean);
        } else {
          // 다른 역할들은 기존 로직대로
          // 1단계: user_roles에서 해당 역할의 user_id 가져오기
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', email);

          if (userRoles && userRoles.length > 0) {
            const userIds = userRoles.map((ur: any) => ur.user_id);

            // 2단계: profiles에서 해당 user_id들의 이메일 가져오기
            const { data: profiles } = await supabase
              .from('profiles')
              .select('email')
              .in('id', userIds)
              .not('email', 'is', null);

            if (profiles) {
              targetEmails = profiles.map((p: any) => p.email).filter(Boolean);
            }
          }
        }
      } else {
        targetEmails = [email];
      }

      // 각 이메일에 발송 (중복 제거 및 rate limiting 적용)
      for (const targetEmail of targetEmails) {
        const emailLower = targetEmail.toLowerCase();

        // 이미 발송한 이메일은 건너뛰기
        if (sentEmails.has(emailLower)) {
          console.log(`[DUPLICATE BLOCKED] Skipping duplicate email to ${targetEmail}`);
          recipientDetails.push({
            email: targetEmail,
            role: emailToRole.get(emailLower) || 'unknown',
            status: 'duplicate_blocked',
            reason: '동일 이메일 중복 발송 차단'
          });
          continue;
        }
        sentEmails.add(emailLower);

        const userRole = emailToRole.get(emailLower);

        // director와 manager는 전체 결과, instructor는 본인 결과만 (admin은 발송 대상에서 제외됨)
        let instructorId: string | null = null;
        let dataScope = 'full'; // 'full' 또는 'filtered'
        if (userRole === 'director' || userRole === 'manager') {
          // 조직장과 운영자는 전체 결과
          instructorId = null;
          dataScope = 'full';
        } else {
          // 강사 또는 다른 역할은 본인 결과만
          instructorId = emailToInstructorId.get(emailLower) || null;
          dataScope = 'filtered';
        }

        // 강사 필터링된 경우, 해당 강사의 응답 수 확인
        if (instructorId) {
          const instructorSessionIds = Array.from(sessionIdToInstructorId.entries())
            .filter(([_, iid]) => iid === instructorId)
            .map(([sid]) => sid);

          const instructorResponseCount = responses.filter(
            (r: any) => r.session_id && instructorSessionIds.includes(r.session_id)
          ).length;

          // 해당 강사의 응답이 0건이면 발송하지 않음
          if (instructorResponseCount === 0) {
            console.log(`[SKIP] ${targetEmail}: No responses for instructor ${instructorId} (0 out of ${responses.length} total responses)`);
            recipientDetails.push({
              email: targetEmail,
              role: userRole || 'instructor',
              dataScope,
              instructorId,
              status: 'skipped',
              reason: '해당 강사의 세션에 응답이 없음'
            });
            continue;
          }
        }

        const content = buildContent(instructorId);

        const fromAddress = Deno.env.get("RESEND_FROM_ADDRESS") || "onboarding@resend.dev";
        const replyTo = Deno.env.get("RESEND_REPLY_TO") || undefined;

        try {
          console.log(`[SENDING] ${targetEmail} (role: ${userRole || 'unknown'}, scope: ${dataScope}, instructorId: ${instructorId || 'none'})`);
          const sendRes: any = await resend.emails.send({
            from: fromAddress,
            to: [targetEmail],
            reply_to: replyTo,
            subject: content.subject,
            html: content.html,
          });

          if (sendRes?.error) {
            console.error(`[FAILED] ${targetEmail}:`, sendRes.error);
            results.push({
              to: targetEmail,
              status: "failed",
              error: sendRes.error.message || String(sendRes.error),
              role: userRole,
              dataScope
            });
            recipientDetails.push({
              email: targetEmail,
              role: userRole || 'unknown',
              dataScope,
              instructorId: instructorId || null,
              status: 'failed',
              error: sendRes.error.message || String(sendRes.error)
            });
          } else {
            console.log(`[SUCCESS] ${targetEmail}, ID: ${sendRes?.id}`);
            results.push({
              to: targetEmail,
              status: "sent",
              emailId: sendRes?.id,
              role: userRole,
              dataScope
            });
            recipientDetails.push({
              email: targetEmail,
              role: userRole || 'unknown',
              dataScope,
              instructorId: instructorId || null,
              status: 'sent',
              emailId: sendRes?.id
            });
          }

          // Rate limiting: 초당 2개 제한을 지키기 위해 600ms 대기 (여유있게)
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (emailErr: any) {
          console.error(`[EXCEPTION] ${targetEmail}:`, emailErr);
          results.push({
            to: targetEmail,
            status: "failed",
            error: emailErr?.message || String(emailErr),
            role: userRole,
            dataScope
          });
          recipientDetails.push({
            email: targetEmail,
            role: userRole || 'unknown',
            dataScope,
            instructorId: instructorId || null,
            status: 'failed',
            error: emailErr?.message || String(emailErr)
          });
        }
      }
    }

    // Save to email_logs with detailed information
    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    const duplicateBlockedCount = recipientDetails.filter((r) => r.status === "duplicate_blocked").length;
    const skippedCount = recipientDetails.filter((r) => r.status === "skipped").length;
    const recipientList = [...new Set(results.map((r) => r.to))];

    // 역할별 통계
    const roleStats = recipientDetails.reduce((acc: any, r: any) => {
      const role = r.role || 'unknown';
      if (!acc[role]) {
        acc[role] = { total: 0, sent: 0, failed: 0, duplicate_blocked: 0, skipped: 0 };
      }
      acc[role].total++;
      if (r.status === 'sent') acc[role].sent++;
      if (r.status === 'failed') acc[role].failed++;
      if (r.status === 'duplicate_blocked') acc[role].duplicate_blocked++;
      if (r.status === 'skipped') acc[role].skipped++;
      return acc;
    }, {});

    // 데이터 스코프 통계
    const scopeStats = recipientDetails.reduce((acc: any, r: any) => {
      if (r.dataScope) {
        if (!acc[r.dataScope]) acc[r.dataScope] = 0;
        if (r.status === 'sent') acc[r.dataScope]++;
      }
      return acc;
    }, {});

    try {
      const logEntry = {
        survey_id: surveyId,
        recipients: recipientList,
        status: failedCount === 0 && sentCount > 0 ? "success" : (sentCount > 0 ? "partial" : "failed"),
        sent_count: sentCount,
        failed_count: failedCount,
        results: {
          emailResults: results,
          recipientDetails,
          survey_info: surveyInfo,
          question_analysis: questionAnalysis,
          statistics: {
            total_recipients: recipientDetails.length,
            sent: sentCount,
            failed: failedCount,
            duplicate_blocked: duplicateBlockedCount,
            skipped: skippedCount,
            by_role: roleStats,
            by_scope: scopeStats
          },
          metadata: {
            sent_at: new Date().toISOString(),
            rate_limit_delay_ms: 600
          }
        },
      };

      console.log(`[LOG SUMMARY] Survey ${surveyId}: ${sentCount} sent, ${failedCount} failed, ${duplicateBlockedCount} blocked, ${skippedCount} skipped`);
      console.log(`[LOG STATS] Roles:`, JSON.stringify(roleStats));
      console.log(`[LOG STATS] Scopes:`, JSON.stringify(scopeStats));

      await supabase.from("email_logs").insert(logEntry);
    } catch (logErr: any) {
      console.error("[LOG ERROR] Failed to save email log:", logErr);
    }

    return new Response(
      JSON.stringify({ success: true, sentCount, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("Error in send-survey-results function:", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
