
import { Survey, ProcessedQuestionData } from "./types.ts";

interface EmailTemplateData {
    survey: Survey;
    instructorNames: string;
    responseCount: number;
    stats: {
        instructor: number | null;
        course: number | null;
        overall: number | null;
    };
    questionGroups: ProcessedQuestionData[];
    sessionSatisfactionMap: Map<string, { sessionName: string; instructorName: string; avg: number; count: number }>;
}

export const generateEmailHtml = (data: EmailTemplateData): string => {
    const { survey, instructorNames, responseCount, stats, questionGroups, sessionSatisfactionMap } = data;

    let questionSummary = "";
    let lastSessionId: string | null = null;

    questionGroups.forEach((qa) => {
        // 세션(과목)이 바뀔 때 섹션 헤더 추가
        // Note: This relies on questionGroups being sorted by sessionId or similar order as in original code? 
        // The original code iterated Object.values(qaMap). In JS/Typescript, keys are not strictly ordered, 
        // but usually inserted order is preserved for string keys. We should ensure the list passed here is sorted if needed.

        if (qa.sessionId && qa.sessionId !== lastSessionId) {
            const sessionSat = qa.sessionId ? sessionSatisfactionMap.get(qa.sessionId) : null;
            const sessionResponseCount = sessionSat ? sessionSat.count : 0;
            // responseRate calculation was in original but seemed based on totalResponses of the *filtered* set.
            // We will just use the passed data.

            const isLowSatisfaction = sessionSat && sessionSat.avg <= 6;
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
                    응답 ${sessionResponseCount}명
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
            const totalCount = Object.values(qa.stats.distribution).reduce((sum: number, count: number) => sum + count, 0);
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
                    <div style="width:${barWidth}%;height:8px;background-color:#6366f1;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
            });
            questionSummary += '</table>';
        } else if (['text', 'textarea'].includes(qa.type) && qa.answers.length > 0) {
            questionSummary += `
        <div style="font-size:13px;color:#475569;">
          <div style="margin-bottom:12px;font-weight:600;">${qa.answers.length}건의 의견:</div>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
      `;
            qa.answers.forEach((answer: string | number, idx: number) => {
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

    return `
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
                      ${stats.instructor !== null ? `
                      <td width="32%" style="padding-right:2%;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
                          <tr>
                            <td style="padding:16px;background-color:#ffffff;border-radius:8px;">
                              <div style="font-size:24px;font-weight:800;color:#6366f1;margin-bottom:4px;">${stats.instructor}</div>
                              <div style="font-size:12px;color:#64748b;font-weight:600;">강사 만족도</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                      ` : ''}
                      ${stats.course !== null ? `
                      <td width="32%" style="padding-right:2%;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
                          <tr>
                            <td style="padding:16px;background-color:#ffffff;border-radius:8px;">
                              <div style="font-size:24px;font-weight:800;color:#10b981;margin-bottom:4px;">${stats.course}</div>
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
                              <div style="font-size:24px;font-weight:800;color:#334155;margin-bottom:4px;">${responseCount}명</div>
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
};
