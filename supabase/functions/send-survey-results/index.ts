import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHtml } from "./email-template.ts";
import type {
  SendResultsRequest,
  Survey,
  Session,
  Instructor,
  QuestionAnswer,
  ProcessedQuestionData,
  QuestionStats
} from "./types.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function uniq<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { surveyId, recipients = [], previewOnly, targetInstructorIds }: SendResultsRequest = await req.json();

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
    const { data: surveyData, error: surveyErr } = await supabase
      .from("surveys")
      .select("*")
      .eq("id", surveyId)
      .single();
    if (surveyErr || !surveyData) throw new Error("Survey not found");
    const survey = surveyData as Survey;

    // 2) Sessions + instructors
    const { data: sessions, error: sessErr } = await supabase
      .from("survey_sessions")
      .select(`id, session_name, instructor_id, instructors (id, name, email)`)
      .eq("survey_id", surveyId);
    if (sessErr) throw new Error("Failed to fetch sessions");

    const sessionIdToInstructorId = new Map<string, string>();
    const sessionIdToInstructorName = new Map<string, string>();
    const sessionIdToSessionName = new Map<string, string>();
    const instructorsFromSessions: Instructor[] = [];

    sessions?.forEach((s: any) => {
      if (s?.id && s?.instructor_id) sessionIdToInstructorId.set(s.id, s.instructor_id);
      if (s?.id && s?.instructors?.name) sessionIdToInstructorName.set(s.id, s.instructors.name);
      if (s?.id && s?.session_name) sessionIdToSessionName.set(s.id, s.session_name);
      if (s?.instructors?.id) {
        instructorsFromSessions.push({
          id: s.instructors.id,
          name: s.instructors.name,
          email: s.instructors.email
        });
      }
    });

    // 3) Extra instructors
    const extraInstructors: Instructor[] = [];
    if (survey.instructor_id) {
      const { data: inst } = await supabase
        .from("instructors")
        .select("id, name, email")
        .eq("id", survey.instructor_id)
        .single();
      if (inst) extraInstructors.push(inst as Instructor);
    }
    const { data: surveyInstructors } = await supabase
      .from("survey_instructors")
      .select(`instructor_id, instructors (id, name, email)`)
      .eq("survey_id", surveyId);

    surveyInstructors?.forEach((si: any) => {
      const inst = si?.instructors;
      if (inst) extraInstructors.push(inst as Instructor);
    });

    const allInstructors = uniq(
      [...instructorsFromSessions, ...extraInstructors],
      (i) => i.id
    );

    // 4) Responses
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
    const { data: answersData, error: ansErr } = await supabase
      .from("question_answers")
      .select(`id, response_id, question_id, answer_text, answer_value,
               survey_questions (id, question_text, question_type, satisfaction_type, session_id)`)
      .in("response_id", responseIds);
    if (ansErr) throw new Error("Failed to fetch answers");
    const answers = answersData as QuestionAnswer[];

    // 6) Resolve Recipients & Roles (Optimized)
    // Separate raw emails from roles
    const rawEmails = new Set<string>();
    const rolesToResolve = new Set<string>();

    recipients.forEach(r => {
      const lower = r.toLowerCase();
      if (['director', 'manager', 'instructor', 'admin'].includes(lower)) {
        rolesToResolve.add(lower);
      } else {
        rawEmails.add(lower);
      }
    });

    const emailToInstructorId = new Map<string, string>();
    allInstructors.forEach((inst) => {
      if (inst.email) emailToInstructorId.set(String(inst.email).toLowerCase(), inst.id);
    });

    // Fetch User Roles for role recipients
    const roleBasedUserIds = new Set<string>();
    if (rolesToResolve.size > 0) {
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', Array.from(rolesToResolve));

      userRolesData?.forEach((ur: any) => {
        roleBasedUserIds.add(ur.user_id);
      });
    }

    // Fetch Profiles: either directly by email OR by resolved user_ids
    let profileQuery = supabase
      .from('profiles')
      .select('id, email, instructor_id')
      .not('email', 'is', null);

    // Build OR condition for query efficiency: (email in rawEmails) OR (id in roleBasedUserIds)
    const conditions: string[] = [];
    if (rawEmails.size > 0) {
      conditions.push(`email.in.(${Array.from(rawEmails).map(e => `"${e}"`).join(',')})`);
    }
    if (roleBasedUserIds.size > 0) {
      conditions.push(`id.in.(${Array.from(roleBasedUserIds).map(id => `"${id}"`).join(',')})`);
    }

    let fetchedProfiles: any[] = [];
    if (conditions.length > 0) {
      // Use .or() with the constructed string
      const { data } = await profileQuery.or(conditions.join(','));
      fetchedProfiles = data || [];
    }

    // Also fetch roles for these found profiles to build the map correctly
    const relevantUserIds = fetchedProfiles.map(p => p.id);
    let relevantUserRoles: any[] = [];
    if (relevantUserIds.length > 0) {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', relevantUserIds);
      relevantUserRoles = data || [];
    }

    // Build Maps
    const emailToRole = new Map<string, string>();

    fetchedProfiles.forEach(p => {
      const email = String(p.email).toLowerCase();
      if (p.instructor_id) {
        if (!emailToInstructorId.has(email)) emailToInstructorId.set(email, p.instructor_id);
      }

      const roles = relevantUserRoles.filter(ur => ur.user_id === p.id).map(ur => ur.role);
      // Prioritize director/admin
      if (roles.includes('director') || roles.includes('admin')) {
        emailToRole.set(email, roles.includes('director') ? 'director' : 'admin');
      } else if (roles.length > 0) {
        emailToRole.set(email, roles[0]);
      } else if (p.instructor_id) {
        emailToRole.set(email, 'instructor');
      }
    });

    // Special handling for 'instructor' role request
    if (rolesToResolve.has('instructor')) {
      const targetIds = targetInstructorIds && targetInstructorIds.length > 0 ? new Set(targetInstructorIds) : null;

      allInstructors.forEach(inst => {
        if (targetIds && !targetIds.has(inst.id)) return; // Skip if not in target list

        if (inst.email) {
          const email = inst.email.toLowerCase();
          rawEmails.add(email);
          emailToRole.set(email, 'instructor');
          emailToInstructorId.set(email, inst.id);
        }
      });
    }

    // Prepare processing function
    const buildContent = (targetInstructorId: string | null) => {
      let filteredResponseIds = new Set<string>(responseIds);

      if (targetInstructorId) {
        const sessionIds = Array.from(sessionIdToInstructorId.entries())
          .filter(([_, iid]) => iid === targetInstructorId)
          .map(([sid]) => sid);

        filteredResponseIds = new Set(
          responses
            .filter((r: any) => r.session_id && sessionIds.includes(r.session_id))
            .map((r: any) => r.id)
        );
      }

      const filteredAnswers = answers?.filter((a) => filteredResponseIds.has(a.response_id)) || [];
      const qaMap: Record<string, ProcessedQuestionData> = {};

      filteredAnswers.forEach((a) => {
        const q = a.survey_questions;
        if (!q) return;
        const qid = a.question_id;

        if (!qaMap[qid]) {
          const sessId = q.session_id || null;
          qaMap[qid] = {
            question: q.question_text,
            type: q.question_type,
            satisfaction_type: q.satisfaction_type,
            sessionId: sessId,
            sessionName: sessId ? sessionIdToSessionName.get(sessId) || null : null,
            instructor: sessId ? sessionIdToInstructorName.get(sessId) || null : null,
            instructorId: sessId ? sessionIdToInstructorId.get(sessId) || null : null,
            answers: [],
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
          else if (val && typeof val === "object" && val !== null) {
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

      // Calculate aggregates
      Object.keys(qaMap).forEach((k) => {
        const row = qaMap[k];
        if (row.type === "rating" || row.type === "scale") {
          const nums = row.answers.filter((x): x is number => typeof x === "number");
          if (nums.length > 0) {
            const avg = nums.reduce((s, v) => s + v, 0) / nums.length;
            row.stats.average = Number(avg.toFixed(1));
            row.stats.count = nums.length;
          }
        } else if (row.type === "multiple_choice" || row.type === "single_choice") {
          const counts: Record<string, number> = {};
          row.answers.forEach((v) => {
            const key = String(v);
            counts[key] = (counts[key] || 0) + 1;
          });
          row.stats.distribution = counts;
        }
      });

      const ratingRows = Object.values(qaMap).filter((r) => r.type === "rating" || r.type === "scale");
      const calculateTypeSatisfaction = (satisfactionType: string | null) => {
        const filtered = satisfactionType
          ? ratingRows.filter((r) => r.satisfaction_type === satisfactionType)
          : ratingRows;
        const all = filtered.flatMap((r) => r.answers.filter((x): x is number => typeof x === "number"));
        return all.length > 0 ? Number((all.reduce((s, v) => s + v, 0) / all.length).toFixed(1)) : null;
      };

      const avgInstructorSatisfaction = calculateTypeSatisfaction('instructor');
      const avgCourseSatisfaction = calculateTypeSatisfaction('course');
      const avgOverallSatisfaction = calculateTypeSatisfaction(null);

      // Session satisfaction map
      const sessionSatisfactionMap = new Map<string, { sessionName: string; instructorName: string; avg: number; count: number }>();
      ratingRows.forEach((r) => {
        if (r.satisfaction_type === 'instructor' && r.sessionId && r.answers.length > 0) {
          const nums = r.answers.filter((x): x is number => typeof x === "number");
          if (nums.length > 0) {
            const existing = sessionSatisfactionMap.get(r.sessionId);
            if (existing) {
              const currentSum = existing.avg * existing.count;
              const newSum = nums.reduce((s, v) => s + v, 0);
              const newCount = existing.count + nums.length;
              existing.avg = (currentSum + newSum) / newCount;
              existing.count = newCount;
            } else {
              const avg = nums.reduce((s, v) => s + v, 0) / nums.length;
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

      const emailHtml = generateEmailHtml({
        survey,
        instructorNames: allInstructors.map((i) => i.name).filter(Boolean).join(", ") || "미등록",
        responseCount: filteredResponseIds.size,
        stats: {
          instructor: avgInstructorSatisfaction,
          course: avgCourseSatisfaction,
          overall: avgOverallSatisfaction,
        },
        questionGroups: Object.values(qaMap),
        sessionSatisfactionMap,
      });

      const subject = `📊 설문 결과 발송: ${survey.title || survey.course_name || '설문'}`;

      return { subject, html: emailHtml };
    };

    if (previewOnly) {
      const expandedEmails: string[] = [];

      // 1. Roles
      if (rolesToResolve.size > 0) {
        fetchedProfiles.forEach(p => {
          const pRoles = relevantUserRoles
            .filter(ur => ur.user_id === p.id && rolesToResolve.has(ur.role))
            .map(ur => ur.role);

          if (pRoles.length > 0 && p.email) expandedEmails.push(p.email);
        });

        if (rolesToResolve.has('instructor')) {
          allInstructors.forEach(inst => {
            if (inst.email) expandedEmails.push(inst.email);
          });
        }
      }

      // 2. Direct emails
      rawEmails.forEach(e => expandedEmails.push(e));

      const uniqueEmails = uniq(expandedEmails, (e) => e);

      let previewInstructorId: string | null = null;
      for (const email of uniqueEmails) {
        if (emailToInstructorId.has(email)) {
          previewInstructorId = emailToInstructorId.get(email) || null;
          break;
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

    // --------------------------------------------------------------------------
    // EXECUTION MODE
    // --------------------------------------------------------------------------

    interface EmailJob {
      email: string;
      role: string;
      dataScope: string;
      instructorId: string | null;
    }

    const emailJobs: EmailJob[] = [];
    const sentEmails = new Set<string>();

    // 1. Add from resolved profiles (Roles)
    fetchedProfiles.forEach(p => {
      const email = String(p.email).toLowerCase();
      const pRoles = relevantUserRoles.filter(ur => ur.user_id === p.id).map(ur => ur.role);
      const requestedRoles = pRoles.filter(r => rolesToResolve.has(r));

      if (requestedRoles.length > 0) {
        const role = requestedRoles.includes('director') || requestedRoles.includes('admin')
          ? (requestedRoles.includes('director') ? 'director' : 'admin')
          : requestedRoles[0];

        if (!sentEmails.has(email)) {
          let instructorId: string | null = null;
          let dataScope = 'full';

          if (role === 'director' || role === 'manager' || role === 'admin') {
            dataScope = 'full';
          } else {
            instructorId = p.instructor_id || null;
            dataScope = 'filtered';
          }

          emailJobs.push({ email, role, dataScope, instructorId });
          sentEmails.add(email);
        }
      }
    });

    const allTargets = new Set([...rawEmails]);

    if (rolesToResolve.has('instructor')) {
      allInstructors.forEach(i => {
        if (i.email) allTargets.add(i.email.toLowerCase());
      });
    }

    for (const email of allTargets) {
      if (sentEmails.has(email)) continue;

      const role = emailToRole.get(email) || 'guest';
      const instructorId = emailToInstructorId.get(email) || null;
      let dataScope = 'full';

      if (role === 'director' || role === 'manager' || role === 'admin') {
        dataScope = 'full';
      } else if (instructorId) {
        dataScope = 'filtered';
      }

      emailJobs.push({ email, role, dataScope, instructorId });
      sentEmails.add(email);
    }

    const fromAddress = Deno.env.get("RESEND_FROM_ADDRESS") || "onboarding@resend.dev";

    interface SendResult {
      email: string;
      status: 'sent' | 'failed' | 'error';
      id?: string;
      error?: any;
    }
    const results: SendResult[] = [];

    interface RecipientDetail {
      email: string;
      role: string;
      status: 'sent' | 'failed' | 'error';
      error?: string;
    }
    const recipientDetails: RecipientDetail[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < emailJobs.length; i += BATCH_SIZE) {
      const batch = emailJobs.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (job) => {
        try {
          // Note: buildContent might be CPU intensive, but in JS/Deno it blocks the event loop anyway.
          // However, putting it inside the promise allows us to conceptually 'start' the send op.
          const content = buildContent(job.instructorId);

          const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: job.email,
            subject: content.subject,
            html: content.html,
          });

          if (error) {
            console.error(`Error sending to ${job.email}:`, error);
            return {
              result: { email: job.email, status: 'failed' as const, error },
              detail: { email: job.email, role: job.role, status: 'failed' as const, error: error.message }
            };
          } else {
            return {
              result: { email: job.email, status: 'sent' as const, id: data?.id },
              detail: { email: job.email, role: job.role, status: 'sent' as const }
            };
          }
        } catch (err: any) {
          console.error(`Exception sending to ${job.email}:`, err);
          return {
            result: { email: job.email, status: 'error' as const, error: err.message },
            detail: { email: job.email, role: job.role, status: 'error' as const, error: err.message }
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(r => {
        results.push(r.result);
        recipientDetails.push(r.detail);
      });
    }

    const globalContent = buildContent(null);

    await supabase.from("email_logs").insert({
      survey_id: surveyId,
      user_id: null,
      recipient_count: results.filter(r => r.status === 'sent').length,
      recipient_details: recipientDetails,
      email_subject: globalContent.subject,
      email_content_snapshot: "HTML content generated",
      status: results.some(r => r.status === 'failed' || r.status === 'error') ? 'partial_success' : 'success',
      meta_data: {
        survey_info: survey,
      }
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
