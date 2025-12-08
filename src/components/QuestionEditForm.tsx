import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Props = {
  surveyId: string;
  question?: any | null;
  onSave: () => void;
  onCancel: () => void;
  sections: Array<{ id: string; name: string }>;
  sessions: Array<any>;
};

const TYPES = [
  { v: "scale", label: "척도(1~10)" },
  { v: "radio", label: "단일선택" },
  { v: "checkbox", label: "다중선택" },
  { v: "text", label: "서술형" },
];

export default function QuestionEditForm({
  surveyId,
  question,
  onSave,
  onCancel,
  sections,
  sessions,
}: Props) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [type, setType] = useState("scale");
  const [required, setRequired] = useState(true);
  const [options, setOptions] = useState<any>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [scope, setScope] = useState<"session" | "operation">("session");
  const [satisfactionType, setSatisfactionType] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setText(question.question_text);
      setType(question.question_type);
      setRequired(!!question.is_required);
      setOptions(question.options ?? null);
      setSectionId(question.section_id ?? null);
      setScope(question.scope ?? "session");
      setSatisfactionType(question.satisfaction_type ?? null);
    } else {
      setText("");
      setType("scale");
      setRequired(true);
      setOptions(null);
      setSectionId(null);
      setScope("session");
      setSatisfactionType(null);
    }
  }, [question]);

  const handleSave = async () => {
    if (!text.trim()) {
      toast({ title: "질문 내용이 비어있습니다.", variant: "destructive" });
      return;
    }
    const payload = {
      survey_id: surveyId,
      question_text: text.trim(),
      question_type: type,
      is_required: required,
      options,
      section_id: sectionId,
      scope,
      satisfaction_type: satisfactionType,
    };

    if (question?.id) {
      const { error } = await supabase.from("survey_questions").update(payload).eq("id", question.id);
      if (error) {
        toast({ title: "수정 실패", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      // order_index 맨 뒤로
      const { data: last, error: oErr } = await supabase
        .from("survey_questions")
        .select("order_index")
        .eq("survey_id", surveyId)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (oErr) {
        toast({ title: "저장 실패", description: oErr.message, variant: "destructive" });
        return;
      }
      const nextOrder = (last?.order_index ?? -1) + 1;
      const { error } = await supabase.from("survey_questions").insert({ ...payload, order_index: nextOrder });
      if (error) {
        toast({ title: "저장 실패", description: error.message, variant: "destructive" });
        return;
      }
    }
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>질문 내용</Label>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>질문 유형</Label>
          <Select value={type} onValueChange={(v) => setType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>섹션</Label>
          <SearchableSelect
            options={[
              { value: 'none', label: '선택 안 함' },
              ...sections.map((s) => ({ value: s.id, label: s.name }))
            ]}
            value={sectionId ?? "none"}
            onValueChange={(v) => setSectionId(v === "none" ? null : v)}
            placeholder="선택 안 함"
            searchPlaceholder="섹션명 검색..."
            emptyText="검색 결과가 없습니다."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>만족도 분류(선택)</Label>
          <Select value={satisfactionType ?? "none"} onValueChange={(v) => setSatisfactionType(v === "none" ? null : v)}>
            <SelectTrigger><SelectValue placeholder="선택 안 함" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">선택 안 함</SelectItem>
              <SelectItem value="course">과목 만족도</SelectItem>
              <SelectItem value="instructor">강사 만족도</SelectItem>
              <SelectItem value="operation">운영 만족도</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>필수 여부</Label>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            <span>필수</span>
          </div>
        </div>
      </div>

      {/* 강사 만족도일 때 강사 정보 표시 */}
      {satisfactionType === 'instructor' && sessions.length > 0 && (
        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <span className="text-lg">👨‍🏫</span>
            <h4 className="font-medium">강사 정보</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white p-3 rounded border">
                <div className="font-medium text-sm">
                  {session.course?.title || session.session_name}
                </div>
                <div className="text-lg font-semibold text-blue-700">
                  {session.instructor?.name || '강사명 없음'}
                </div>
                {session.instructor?.bio && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {session.instructor.bio}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-xs text-blue-600">
            💡 이 질문은 각 강사별로 개별적으로 표시됩니다.
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={handleSave}>저장</Button>
      </div>
    </div>
  );
}
