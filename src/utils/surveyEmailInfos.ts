
import { SupabaseClient } from '@supabase/supabase-js';

// Types needed for generation
interface SurveyInfo {
    title: string;
    course_name?: string;
    education_year?: number;
    education_round?: number;
}

interface Instructor {
    name: string;
    email?: string;
    id?: string;
}

interface QuestionStat {
    question: string;
    type: string;
    satisfaction_type?: string;
    answers: any[];
    stats: {
        average?: number;
        count?: number;
        distribution?: Record<string, number>;
    };
    sessionId?: string;
    sessionName?: string;
    instructor?: string;
}

interface EmailContent {
    subject: string;
    html: string;
    text: string;
}

// Helper to calculate stats from raw answers
export const calculateSurveyStats = (
    questions: any[],
    answers: any[],
    sessions: any[],
    surveyInstructors: any[]
) => {
    const qaMap: Record<string, any> = {};

    // Initialize map with questions
    questions.forEach(q => {
        // Find session info
        const session = sessions.find(s => s.id === q.session_id);
        let instructorName = null;
        let sessionName = null;

        if (session) {
            sessionName = session.session_name;
            if (session.instructors) {
                instructorName = session.instructors.name;
            }
        }

        qaMap[q.id] = {
            question: q.question_text,
            type: q.question_type,
            satisfaction_type: q.satisfaction_type,
            sessionId: q.session_id,
            sessionName,
            instructor: instructorName,
            answers: [],
            stats: {},
        };
    });

    // Populate answers
    answers.forEach((a) => {
        const row = qaMap[a.question_id];
        if (!row) return;

        const val = a.answer_value;
        const text = a.answer_text;

        if (row.type === "rating" || row.type === "scale") {
            let n: number | null = null;
            if (typeof val === "number") n = val;
            else if (typeof val === "string" && !isNaN(Number(val))) n = Number(val);
            else if (typeof text === "string" && !isNaN(Number(text))) n = Number(text);

            if (typeof n === "number" && !isNaN(n)) row.answers.push(n);
        } else if (row.type === "multiple_choice" || row.type === "single_choice" || row.type === "multiple_choice_multiple") {
            const pushChoice = (s: any) => {
                if (s == null) return;
                const v = typeof s === "object" ? (s.label ?? s.value ?? JSON.stringify(s)) : s;
                const str = String(v).trim();
                if (str) row.answers.push(str);
            };

            if (typeof text === "string" && text.trim()) pushChoice(text);
            else if (Array.isArray(val)) val.forEach(pushChoice);
            else if (typeof val === "string") pushChoice(val);
        } else if (typeof text === "string" && text.trim()) {
            row.answers.push(text.trim());
        }
    });

    // Compute aggregated stats
    Object.values(qaMap).forEach((row: any) => {
        if (row.type === "rating" || row.type === "scale") {
            const nums = row.answers.filter((x: any) => typeof x === "number" && !isNaN(x));
            if (nums.length > 0) {
                const avg = nums.reduce((s: number, v: number) => s + v, 0) / nums.length;
                row.stats.average = Number(avg.toFixed(1));
                row.stats.count = nums.length;
            }
        } else if (["multiple_choice", "single_choice", "multiple_choice_multiple"].includes(row.type)) {
            const counts: Record<string, number> = {};
            row.answers.forEach((v: any) => {
                const key = String(v);
                counts[key] = (counts[key] || 0) + 1;
            });
            row.stats.distribution = counts;
        }
    });

    return Object.values(qaMap) as QuestionStat[];
};

export const generateSurveyEmailContent = (
    survey: SurveyInfo,
    questionStats: QuestionStat[],
    instructors: Instructor[],
    totalResponseCount: number
): EmailContent => {
    const instructorNames = instructors.map(i => i.name).join(", ") || "미등록";
    const emailSubject = `📊 설문 결과 발송: ${survey.title || survey.course_name || '설문'}`;

    // Top Level Satisfaction Stats
    const calculateTypeSatisfaction = (satisfactionType: string | null) => {
        const filtered = satisfactionType
            ? questionStats.filter((r) => r.satisfaction_type === satisfactionType)
            : questionStats.filter((r) => r.type === 'rating' || r.type === 'scale');

        const all = filtered.flatMap((r) => r.answers.filter((x) => typeof x === "number" && !isNaN(x)));
        return all.length > 0 ? Number((all.reduce((s, v) => s + v, 0) / all.length).toFixed(1)) : null;
    };

    const avgInstructorSatisfaction = calculateTypeSatisfaction('instructor');
    const avgCourseSatisfaction = calculateTypeSatisfaction('course');
    const avgOperationSatisfaction = calculateTypeSatisfaction('operation');
    const avgOverallSatisfaction = calculateTypeSatisfaction(null);

    // Session Map for Headers
    const sessionSatisfactionMap = new Map<string, { avg: number; count: number }>();
    questionStats.forEach(q => {
        // Only calculate for instructor satisfaction questions linked to a session
        if (q.satisfaction_type === 'instructor' && q.sessionId && q.answers.length > 0) {
            const nums = q.answers.filter((x: any) => typeof x === "number" && !isNaN(x));
            if (nums.length > 0) {
                const current = sessionSatisfactionMap.get(q.sessionId);
                if (current) {
                    // Weighted avg update approximation (simplification)
                    const totalSum = (current.avg * current.count) + nums.reduce((a: number, b: number) => a + b, 0);
                    const totalCount = current.count + nums.length;
                    sessionSatisfactionMap.set(q.sessionId, { avg: totalSum / totalCount, count: totalCount });
                } else {
                    const avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
                    sessionSatisfactionMap.set(q.sessionId, { avg, count: nums.length });
                }
            }
        }
    });

    // Generate HTML
    let questionSummaryHtml = "";
    let lastSessionId: string | null = null;

    // Sort questions to group by session if possible, but rely on input order
    questionStats.forEach((qa) => {
        // Session Header
        if (qa.sessionId && qa.sessionId !== lastSessionId) {
            const sessionSat = sessionSatisfactionMap.get(qa.sessionId);
            const sessionResponseCount = sessionSat ? sessionSat.count : 0; // This count is sum of all answers, might differ from respondent count. 
            // Simplified display for email

            const isLowSatisfaction = sessionSat && sessionSat.avg <= 6;
            const headerBgColor = isLowSatisfaction ? '#b91c1c' : '#4f46e5';
            const borderColor = isLowSatisfaction ? '#991b1b' : '#3730a3';
            const warningIcon = isLowSatisfaction ? '⚠️ ' : '';

            questionSummaryHtml += `
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
                    응답 포함
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
       `;
            lastSessionId = qa.sessionId;
        }

        // Question Body
        questionSummaryHtml += `
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
            questionSummaryHtml += `
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
            const totalCount = Object.values(qa.stats.distribution).reduce((a, b) => a + b, 0);
            questionSummaryHtml += '<table border="0" cellpadding="0" cellspacing="0" width="100%">';
            Object.entries(qa.stats.distribution).forEach(([option, count]) => {
                const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0.0';
                const barWidth = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                questionSummaryHtml += `
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
                      <div style="width:${barWidth}%;height:8px;background-color:#6366f1;"></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
            });
            questionSummaryHtml += '</table>';
        } else if (qa.answers.length > 0) {
            questionSummaryHtml += `
        <div style="font-size:13px;color:#475569;">
          <div style="margin-bottom:12px;font-weight:600;">${qa.answers.length}건의 의견:</div>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
       `;
            qa.answers.forEach((ans, idx) => {
                questionSummaryHtml += `
            <tr>
              <td style="padding-bottom:8px;">
                <div style="padding:10px;background-color:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0;">
                  <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">#${idx + 1}</div>
                  <div style="font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap;">${ans}</div>
                </div>
              </td>
            </tr>
          `;
            });
            questionSummaryHtml += '</table></div>';
        }

        questionSummaryHtml += `
          </td>
        </tr>
      </table>
    `;
    });

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

              <!-- 주요 지표 -->
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
                              <div style="font-size:24px;font-weight:800;color:#334155;margin-bottom:4px;">${totalResponseCount}명</div>
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
                  ${questionSummaryHtml}
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

    // Generate Text Content
    let text = `[설문 결과 보고서]\n${survey.title || survey.course_name || '설문'}\n\n`;
    text += `강사명: ${instructorNames}\n`;
    text += `교육년도: ${survey.education_year ?? ''}년 (${survey.education_round ?? ''}차)\n`;
    text += `작성일: ${new Date().toLocaleDateString('ko-KR')}\n\n`;
    text += `--------------------------------------------------\n\n`;

    if (avgInstructorSatisfaction) text += `👨‍🏫 강사 만족도: ${avgInstructorSatisfaction}점\n`;
    if (avgCourseSatisfaction) text += `📚 과정 만족도: ${avgCourseSatisfaction}점\n`;
    text += `👥 총 응답자: ${totalResponseCount}명\n\n`;
    text += `==================================================\n\n`;
    text += `📝 상세 문항 분석\n\n`;

    let lastSess = null;
    questionStats.forEach((qa, idx) => {
        if (qa.sessionId && qa.sessionId !== lastSess) {
            text += `\n[ ${qa.sessionName} | ${qa.instructor} ]\n`;
            const sat = sessionSatisfactionMap.get(qa.sessionId);
            if (sat) text += `* 만족도: ${sat.avg.toFixed(1)}점\n`;
            text += `--------------------------------------------------\n`;
            lastSess = qa.sessionId;
        }
        text += `${idx + 1}. ${qa.question}\n`;
        if (qa.stats.average) {
            text += `   -> 평균: ${qa.stats.average}점 (${qa.stats.count}명)\n`;
        } else if (qa.stats.distribution) {
            Object.entries(qa.stats.distribution).forEach(([opt, cnt]) => {
                text += `   - ${opt}: ${cnt}명\n`;
            });
        } else if (qa.answers.length > 0) {
            qa.answers.forEach((ans, i) => {
                text += `   ${i + 1}) ${ans}\n`;
            });
        }
        text += `\n`;
    });

    return { subject: emailSubject, html: emailHtml, text };
};
