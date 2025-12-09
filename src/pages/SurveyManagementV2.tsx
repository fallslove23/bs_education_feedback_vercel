// src/pages/SurveyManagementV2.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  BookOpen,
  User,
  AlertCircle,
  Settings,
  Eye,
  Share2,
  Save,
  Bookmark,
  Trash2,
  BarChart,
  Plus,
  Search,
  SortAsc,
  SortDesc,
  CheckSquare,
  Download,
  Wand2,
  QrCode,
  Copy,
  Link,
  Play,
  Pause,
  MoreHorizontal,
  FlaskConical,
} from "lucide-react";
import { getSurveyUrl } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

import {
  SurveysRepository,
  SurveyListItem,
  SurveyFilters,
  SortBy,
  SortDir,
  TemplateLite,
} from "@/repositories/surveysRepo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SurveyCreateForm from "@/components/SurveyCreateForm";
import { useServerPagination, VirtualizedTable, PaginationControls } from "@/components/data-table";
import type { VirtualizedColumn, ServerPaginationParams } from "@/components/data-table";

const TIMEZONE = "Asia/Seoul";
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;

const STATUS_CONFIG = {
  draft: { label: "초안", variant: "secondary" as const },
  active: { label: "진행중", variant: "default" as const },
  public: { label: "진행중", variant: "default" as const },
  completed: { label: "완료", variant: "outline" as const },
  scheduled: { label: "시작예정", variant: "secondary" as const },
  expired: { label: "종료", variant: "destructive" as const },
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type FilterPresetRecord = {
  id: string;
  preset_name: string;
  filter_data: SurveyFilters;
  created_at?: string | null;
  updated_at?: string | null;
};
function Highlight({ text, query }: { text?: string | null; query: string }) {
  const t = text ?? "";
  if (!query.trim()) return <>{t}</>;
  const re = new RegExp(`(${escapeRegExp(query)})`, "ig");
  return (
    <>
      {t.split(re).map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="px-0.5 rounded bg-yellow-100 dark:bg-yellow-900">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function QuickCreateDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  years: number[];
  courseNames: string[];
  templates: TemplateLite[];
  defaultYear: number;
  onCreate: (p: {
    education_year: number;
    education_round: number;
    education_day: number;
    course_name: string;
    template_id: string | null;
  }) => Promise<void>;
}) {
  const { open, onOpenChange, years, courseNames, templates, defaultYear, onCreate } = props;
  const [year, setYear] = useState<number>(defaultYear);
  const [round, setRound] = useState<number>(1);
  const [day, setDay] = useState<number>(1);
  const [course, setCourse] = useState<string>(courseNames[0] ?? "BS Basic");
  const [templateId, setTemplateId] = useState<string | null>(templates[0]?.id ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setYear(defaultYear), [defaultYear]);
  useEffect(() => {
    if (courseNames.length && !courseNames.includes(course)) setCourse(courseNames[0]);
  }, [courseNames]);
  useEffect(() => setTemplateId(templates[0]?.id ?? null), [templates]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onCreate({
        education_year: year,
        education_round: round,
        education_day: day,
        course_name: course,
        template_id: templateId,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            빠른 생성
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">교육 연도</label>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">과정명</label>
            <Select value={course} onValueChange={(v) => setCourse(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {courseNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">차수</label>
              <Input type="number" min={1} value={round}
                onChange={(e) => setRound(parseInt(e.target.value || "1"))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">일차</label>
              <Input type="number" min={1} value={day}
                onChange={(e) => setDay(parseInt(e.target.value || "1"))} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">템플릿</label>
            <Select value={templateId ?? "none"} onValueChange={(v) => setTemplateId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">선택 안 함</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "생성 중..." : "생성"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SurveyManagementV2() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [params, setParams] = useSearchParams();

  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableSessions, setAvailableSessions] = useState<{ value: string; label: string }[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<string[]>([]);  // 빠른 생성용 프로그램 목록
  const [templates, setTemplates] = useState<TemplateLite[]>([]);

  // 서버 페이지네이션을 위한 새로운 상태
  const [useVirtualScroll, setUseVirtualScroll] = useState(false);

  const [filters, setFilters] = useState<SurveyFilters>({
    year: params.get("year") ? parseInt(params.get("year") as string) : null,
    status: (params.get("status") as any) || null,
    sessionId: params.get("session") || null,
    courseName: params.get("course") || null,
    q: params.get("q") || null,
  });

  const [sortBy, setSortBy] = useState<SortBy>((params.get("sortBy") as SortBy) || "created_at");
  const [sortDir, setSortDir] = useState<SortDir>((params.get("sortDir") as SortDir) || "desc");
  const [currentPage, setCurrentPage] = useState<number>(params.get("page") ? parseInt(params.get("page") as string) : 1);

  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchText, setSearchText] = useState(filters.q ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<number | null>(null);

  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [filterPresets, setFilterPresets] = useState<FilterPresetRecord[]>([]);
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = useMemo(() => surveys.length > 0 && surveys.every((s) => selected.has(s.id)), [surveys, selected]);

  // 상세 시트
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSurvey, setSheetSurvey] = useState<SurveyListItem | null>(null);

  // 다이얼로그들
  const [quickOpen, setQuickOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingSurveyId, setDeletingSurveyId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSurveyId, setQrSurveyId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSurveyId, setShareSurveyId] = useState<string | null>(null);

  const normalizeFilters = useCallback((input: Partial<SurveyFilters> | null | undefined): SurveyFilters => {
    return {
      year: typeof input?.year === "number" ? input.year : input?.year ? parseInt(String(input.year), 10) : null,
      status: (input?.status as SurveyFilters["status"]) ?? null,
      sessionId: (input?.sessionId as string) ?? null,
      courseName: input?.courseName ? String(input.courseName) : null,
      q: input?.q ? String(input.q).trim() || null : null,
    };
  }, []);

  const filtersAreEqual = useCallback(
    (a: Partial<SurveyFilters> | null | undefined, b: Partial<SurveyFilters> | null | undefined) => {
      const na = normalizeFilters(a);
      const nb = normalizeFilters(b);
      return (
        (na.year ?? null) === (nb.year ?? null) &&
        (na.status ?? null) === (nb.status ?? null) &&
        (na.sessionId ?? null) === (nb.sessionId ?? null) &&
        (na.courseName ?? null) === (nb.courseName ?? null) &&
        (na.q ?? null) === (nb.q ?? null)
      );
    },
    [normalizeFilters]
  );

  const getSummaryItems = useCallback(
    (target: Partial<SurveyFilters> | null | undefined) => {
      const normalized = normalizeFilters(target);
      const items: { label: string; value: string }[] = [];
      if (normalized.year) items.push({ label: "교육 연도", value: `${normalized.year}년` });
      if (normalized.sessionId) {
        const session = availableSessions.find(s => s.value === normalized.sessionId);
        if (session) items.push({ label: "세션(과정)", value: session.label });
      } else if (normalized.courseName) {
        items.push({ label: "과정", value: normalized.courseName });
      }
      if (normalized.status) {
        const statusInfo = STATUS_CONFIG[normalized.status];
        items.push({ label: "상태", value: statusInfo?.label ?? normalized.status });
      }
      if (normalized.q) items.push({ label: "검색어", value: normalized.q });
      return items;
    },
    [normalizeFilters]
  );

  const fetchFilterPresets = useCallback(async () => {
    if (!user) {
      setFilterPresets([]);
      setActivePresetId(null);
      return;
    }

    try {
      setPresetLoading(true);
      const { data, error } = await supabase
        .from("user_filter_presets")
        .select("id,preset_name,filter_data,created_at,updated_at")
        .eq("user_id", user.id)
        .eq("filter_type", "survey_management")
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const normalized = (data || []).map((item: any) => ({
        id: item.id,
        preset_name: item.preset_name,
        filter_data: normalizeFilters(item.filter_data as Partial<SurveyFilters>),
        created_at: item.created_at ?? null,
        updated_at: item.updated_at ?? null,
      }));
      setFilterPresets(normalized);
    } catch (error) {
      console.error("Error fetching filter presets:", error);
      toast({
        title: "프리셋 불러오기 실패",
        description: "필터 프리셋을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setPresetLoading(false);
    }
  }, [normalizeFilters, toast, user]);

  const handleApplyPreset = useCallback(
    (preset: FilterPresetRecord) => {
      const normalized = normalizeFilters(preset.filter_data);
      setFilters(normalized);
      setSearchText(normalized.q ?? "");
      setCurrentPage(1);
      setSelected(new Set());
      setPresetModalOpen(false);
      setActivePresetId(preset.id);
      toast({
        title: "프리셋 적용됨",
        description: `"${preset.preset_name}" 필터 조합이 적용되었습니다.`,
      });
    },
    [normalizeFilters, toast]
  );

  const handleCopyPresetLink = useCallback(
    async (preset: FilterPresetRecord) => {
      try {
        const normalized = normalizeFilters(preset.filter_data);
        const params = new URLSearchParams();
        if (normalized.year) params.set("year", String(normalized.year));
        if (normalized.status) params.set("status", normalized.status);
        if (normalized.sessionId) params.set("session", normalized.sessionId);
        if (normalized.q) params.set("q", normalized.q);
        if (sortBy) params.set("sortBy", sortBy);
        if (sortDir) params.set("sortDir", sortDir);
        const baseUrl = typeof window !== "undefined"
          ? `${window.location.origin}${routerLocation.pathname}`
          : routerLocation.pathname;
        const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "링크 복사 완료",
          description: `"${preset.preset_name}" 필터 링크가 복사되었습니다.`,
        });
      } catch (error) {
        console.error("Error copying preset link:", error);
        toast({
          title: "링크 복사 실패",
          description: "필터 링크를 복사하는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
    [normalizeFilters, routerLocation.pathname, sortBy, sortDir, toast]
  );

  const handleSavePreset = useCallback(async () => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "필터 프리셋을 저장하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    const name = presetName.trim();
    if (!name) return;

    const filterPayload = normalizeFilters({ ...filters, q: searchText.trim() || null });

    try {
      setPresetSaving(true);
      const { error } = await supabase.from("user_filter_presets").insert({
        user_id: user.id,
        preset_name: name,
        filter_type: "survey_management",
        filter_data: filterPayload as any,
      });
      if (error) throw error;
      toast({
        title: "필터 저장 완료",
        description: `"${name}" 프리셋이 저장되었습니다.`,
      });
      setPresetName("");
      await fetchFilterPresets();
    } catch (error: any) {
      console.error("Error saving filter preset:", error);
      const message = typeof error?.message === "string" ? error.message : "";
      toast({
        title: "필터 저장 실패",
        description: message.includes("duplicate")
          ? "같은 이름의 프리셋이 이미 존재합니다."
          : "필터 프리셋을 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setPresetSaving(false);
    }
  }, [fetchFilterPresets, filters, normalizeFilters, presetName, searchText, toast, user]);

  const handleDeletePreset = useCallback(
    async (presetId: string) => {
      const target = filterPresets.find((p) => p.id === presetId);
      if (!target) return;

      const confirmDelete = window.confirm(`"${target.preset_name}" 프리셋을 삭제하시겠습니까?`);
      if (!confirmDelete) return;

      try {
        const { error } = await supabase.from("user_filter_presets").delete().eq("id", presetId);
        if (error) throw error;
        toast({
          title: "프리셋 삭제 완료",
          description: `"${target.preset_name}" 프리셋이 삭제되었습니다.`,
        });
        if (activePresetId === presetId) {
          setActivePresetId(null);
        }
        await fetchFilterPresets();
      } catch (error) {
        console.error("Error deleting filter preset:", error);
        toast({
          title: "프리셋 삭제 실패",
          description: "필터 프리셋을 삭제하는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
    [activePresetId, fetchFilterPresets, filterPresets, toast]
  );

  const recentPresets = useMemo(() => filterPresets.slice(0, 3), [filterPresets]);

  const activePreset = useMemo(
    () => filterPresets.find((preset) => preset.id === activePresetId) ?? null,
    [filterPresets, activePresetId]
  );

  const filterSummaryItems = useMemo(
    () => getSummaryItems(filters),
    [filters, getSummaryItems]
  );

  // QR 코드 다운로드 함수
  const handleDownloadQR = async (surveyId: string) => {
    try {
      const url = getSurveyUrl(surveyId);
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`);
      const blob = await response.blob();

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `survey-qr-${surveyId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: "QR 코드 다운로드 완료",
        description: "QR 코드가 성공적으로 다운로드되었습니다.",
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "QR 코드 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // URL 동기화
  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.year) p.set("year", String(filters.year));
    if (filters.status) p.set("status", filters.status);
    if (filters.sessionId) p.set("session", filters.sessionId);
    if (filters.q) p.set("q", filters.q);
    if (sortBy) p.set("sortBy", sortBy);
    if (sortDir) p.set("sortDir", sortDir);
    p.set("page", String(currentPage));
    setParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy, sortDir, currentPage]);

  // 서버 페이지네이션 페치 함수
  const fetchSurveysWithPagination = useCallback(async (params: ServerPaginationParams) => {
    const result = await SurveysRepository.fetchSurveyList(
      params.page,
      params.pageSize,
      filters,
      sortBy,
      sortDir
    );
    return {
      data: result.data,
      total: result.count,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: result.totalPages
    };
  }, [filters, sortBy, sortDir]);

  // 서버 페이지네이션 훅 사용
  const paginationHook = useServerPagination(
    fetchSurveysWithPagination,
    PAGE_SIZE,
    []
  );

  // 기존 데이터 로드 (호환성 유지)
  const loadData = async () => {
    await paginationHook.refresh();
    // 추가 데이터 로드
    try {
      const years = await SurveysRepository.getAvailableYears();
      setAvailableYears(years);
    } catch (e: any) {
      setError(e?.message || "데이터를 불러오는데 실패했습니다.");
    }
  };

  // paginationHook 결과를 기존 상태와 동기화
  React.useEffect(() => {
    setSurveys(paginationHook.data);
    setTotalCount(paginationHook.pagination.total);
    setTotalPages(paginationHook.pagination.totalPages);
    setLoading(paginationHook.loading);
    setError(paginationHook.error);
  }, [paginationHook.data, paginationHook.pagination.total, paginationHook.pagination.totalPages, paginationHook.loading, paginationHook.error]);

  const loadSessions = async (year: number | null) => {
    try {
      const { data, error } = await (supabase as any).rpc('rpc_session_filter_options', {
        p_year: year
      });

      let sessionOptions: Array<{ value: string; label: string }> = [];

      if (!error && Array.isArray(data) && data.length > 0) {
        sessionOptions = (data || []).map((item: any) => ({ value: item.value, label: item.label }));
      } else {
        console.warn('rpc_session_filter_options returned empty. Falling back to program_sessions_v1');
        // Fallback: query program_sessions_v1
        let query = (supabase as any)
          .from('program_sessions_v1')
          .select('session_id, program, turn, year')
          .order('program', { ascending: true })
          .order('turn', { ascending: true });

        // year가 null이 아닐 때만 필터링
        if (year !== null) {
          query = query.eq('year', year);
        }

        const { data: sess, error: sessErr } = await query;

        if (!sessErr) {
          sessionOptions = (sess || []).map((row: any) => ({
            value: row.session_id,
            label: `${row.year}년 ${row.turn}차 ${row.program}`,
          }));
        }
      }

      setAvailableSessions(sessionOptions);

      // 현재 선택된 세션이 목록에 없으면 초기화
      if (filters.sessionId && !sessionOptions.some((s: any) => s.value === filters.sessionId)) {
        setFilters((p) => ({ ...p, sessionId: null }));
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
      setAvailableSessions([]);
    }
  };

  const loadPrograms = async () => {
    try {
      const { data, error } = await (supabase as any).from('programs').select('name').order('name');
      if (error) throw error;
      setAvailablePrograms((data || []).map((p: any) => p.name));
    } catch (e) {
      console.error('Failed to load programs:', e);
      setAvailablePrograms([]);
    }
  };

  useEffect(() => {
    // 필터/정렬 변경 시 1페이지로 리셋
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      // 이미 1페이지라면 바로 데이터 갱신 (필터 적용)
      paginationHook.goToPage(1);
    }
  }, [filters.year, filters.status, filters.q, filters.sessionId, sortBy, sortDir]);

  useEffect(() => {
    paginationHook.goToPage(currentPage);
  }, [currentPage]);
  useEffect(() => { loadSessions(filters.year); }, [filters.year]);
  useEffect(() => { loadPrograms(); }, []);
  useEffect(() => { loadData(); }, []); // 초기 로드 시 availableYears 설정
  useEffect(() => { (async () => setTemplates(await SurveysRepository.listTemplates()))(); }, []);
  useEffect(() => { fetchFilterPresets(); }, [fetchFilterPresets]);
  useEffect(() => {
    if (!filterPresets.length) {
      setActivePresetId(null);
      return;
    }
    const matched = filterPresets.find((preset) => filtersAreEqual(preset.filter_data, filters));
    setActivePresetId(matched ? matched.id : null);
  }, [filterPresets, filters, filtersAreEqual]);

  // 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 검색 디바운스
  useEffect(() => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      setFilters((p) => ({ ...p, q: searchText.trim() || null }));
      setCurrentPage(1);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [searchText]);

  const formatSafeDate = (iso: string | null): string => {
    if (!iso) return "미설정";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "미설정";
      return formatInTimeZone(d, TIMEZONE, "yyyy-MM-dd HH:mm");
    } catch {
      return "미설정";
    }
  };

  const getStatusInfo = (s: SurveyListItem) => {
    // DB의 실제 상태를 우선 사용 - 시간 계산은 보조적으로만 사용
    if (s.status === "draft") return STATUS_CONFIG.draft;
    if (s.status === "completed") return STATUS_CONFIG.completed;

    // active/public 상태에서만 시간 기반 세부 상태 체크
    if (s.status === "active" || s.status === "public") {
      const now = new Date();
      const start = s.start_date ? new Date(s.start_date) : null;
      const end = s.end_date ? new Date(s.end_date) : null;

      // 시작 전
      if (start && now < start) return STATUS_CONFIG.scheduled;
      // 종료 후
      if (end && now > end) return STATUS_CONFIG.expired;
      // 진행 중
      return STATUS_CONFIG.active;
    }

    // 기본값
    return STATUS_CONFIG.draft;
  };

  const handleFilterChange = (key: keyof SurveyFilters, value: string) => {
    const v = value === "all" ? null : key === "year" ? (value ? parseInt(value) : null) : (value as any);

    // 연도 변경 시 세션 필터 초기화 (연도 필터가 변경되면 기존 세션 ID는 유효하지 않을 수 있음)
    if (key === 'year') {
      setFilters((prev) => ({ ...prev, [key]: v, sessionId: null }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: v }));
    }

    setCurrentPage(1);
    setSelected(new Set());
  };

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(surveys.map((s) => s.id)));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const exportCsvAll = async () => {
    const res = await SurveysRepository.fetchSurveyList(1, 1000, filters, sortBy, sortDir);
    downloadCsv(res.data);
  };
  const exportCsvSelected = async () => {
    const rows = await SurveysRepository.fetchByIds(Array.from(selected));
    downloadCsv(rows);
  };
  const downloadCsv = (rows: SurveyListItem[]) => {
    const header = [
      "id",
      "title",
      "status",
      "education_year",
      "education_round",
      "education_day",
      "course_name",
      "instructor_name",
      "course_title",
      "creator_email",
      "start_date",
      "end_date",
      "created_at",
    ];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv =
      header.join(",") +
      "\n" +
      rows
        .map((r) =>
          [
            r.id,
            r.title,
            r.status,
            r.education_year,
            r.education_round,
            r.education_day,
            r.course_name,
            r.instructor_name,
            r.course_title,
            r.creator_email,
            r.start_date,
            r.end_date,
            r.created_at,
          ]
            .map(escape)
            .join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `surveys_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleQuickCreate = async (p: {
    education_year: number;
    education_round: number;
    education_day: number;
    course_name: string;
    template_id: string | null;
  }) => {
    const created = await SurveysRepository.quickCreateSurvey({
      ...p,
      program_name: p.course_name // course_name을 program_name으로 매핑
    });
    toast({ title: "설문 생성 완료", description: created.title ?? "" });
    navigate(`/survey-builder/${created.id}`);
  };

  const handleDeleteSurvey = async () => {
    if (!deletingSurveyId) return;

    try {
      // 단일 설문 삭제 또는 다중 설문 삭제 처리
      const isMultiple = deletingSurveyId.includes(',');
      const surveyIds = isMultiple ? deletingSurveyId.split(',') : [deletingSurveyId];

      const { error } = await supabase
        .from('surveys')
        .delete()
        .in('id', surveyIds);

      if (error) throw error;

      toast({
        title: "삭제 완료",
        description: `${surveyIds.length}개 설문이 성공적으로 삭제되었습니다.`
      });

      setDeleteOpen(false);
      setDeletingSurveyId(null);
      setSelected(new Set()); // 선택 해제
      loadData();
    } catch (error) {
      console.error('Error deleting survey:', error);
      toast({
        title: "삭제 실패",
        description: "설문 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleStatusToggle = async (surveyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';

    try {
      const { error } = await supabase
        .from('surveys')
        .update({ status: newStatus })
        .eq('id', surveyId);

      if (error) throw error;

      toast({
        title: "상태 변경 완료",
        description: `설문이 ${newStatus === 'active' ? '활성화' : '비활성화'}되었습니다.`
      });

      loadData();
    } catch (error) {
      console.error('Error updating survey status:', error);
      toast({
        title: "상태 변경 실패",
        description: "설문 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleCopyLink = (surveyId: string) => {
    const link = getSurveyUrl(surveyId);
    navigator.clipboard.writeText(link);
    toast({
      title: "링크 복사됨",
      description: "설문 링크가 클립보드에 복사되었습니다."
    });
  };


  const handleBulkStatusChange = async (surveyIds: string[], newStatus: string) => {
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ status: newStatus })
        .in('id', surveyIds);

      if (error) throw error;

      toast({
        title: "일괄 상태 변경 완료",
        description: `${surveyIds.length}개 설문이 ${newStatus === 'active' ? '활성화' : '비활성화'}되었습니다.`
      });

      setSelected(new Set());
      loadData();
    } catch (error) {
      console.error('Error bulk updating survey status:', error);
      toast({
        title: "상태 변경 실패",
        description: "설문 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateSurvey = async (surveyId: string) => {
    try {
      // 원본 설문 정보 가져오기
      const { data: originalSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      // 새 설문 생성
      const { data: newSurvey, error: createError } = await supabase
        .from('surveys')
        .insert({
          ...originalSurvey,
          id: undefined, // 새 ID 생성
          title: `${originalSurvey.title} (복사본)`,
          status: 'draft',
          created_at: undefined,
          updated_at: undefined
        })
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: "복제 완료",
        description: "설문이 성공적으로 복제되었습니다."
      });

      navigate(`/survey-builder/${newSurvey.id}`);
    } catch (error) {
      console.error('Error duplicating survey:', error);
      toast({
        title: "복제 실패",
        description: "설문 복제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="설문 관리"
        description="전체 설문 생성 및 관리 그리고 통계 확인할 수 있습니다"
        loading={true}
      >
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const q = filters.q ?? "";

  return (
    <DashboardLayout
      title="설문 관리"
      description="전체 설문 생성 및 관리 그리고 통계 확인할 수 있습니다"
      icon={<Plus className="h-5 w-5" />}
      totalCount={totalCount}
      actions={[
        <Button
          key="csv"
          variant="outline"
          size="sm"
          onClick={exportCsvAll}
        >
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>,
        <Button
          key="quick"
          size="sm"
          onClick={() => setQuickOpen(true)}
          disabled={!availableYears.length || !availablePrograms.length}
          className="bg-muted/80 hover:bg-muted text-foreground border-0 rounded-full px-4 gap-2 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md"
        >
          <Wand2 className="h-4 w-4" />
          빠른 생성
        </Button>,
        <Button
          key="create"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          새로 생성
        </Button>
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">최근 저장된 필터</span>
            <Button size="sm" onClick={() => setPresetModalOpen(true)} disabled={presetSaving} className="w-full sm:w-auto text-xs sm:text-sm">
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              필터 저장
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {presetLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 sm:h-8 w-24 sm:w-28" />
                <Skeleton className="h-7 sm:h-8 w-20 sm:w-24" />
              </div>
            ) : recentPresets.length ? (
              recentPresets.map((preset) => (
                <div key={preset.id} className="flex items-center gap-0.5 sm:gap-1">
                  <Button
                    variant={activePresetId === preset.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleApplyPreset(preset)}
                    className="whitespace-nowrap h-7 sm:h-8 text-xs px-2 sm:px-3"
                  >
                    <Bookmark className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{preset.preset_name}</span>
                    <span className="sm:hidden">{preset.preset_name.substring(0, 8)}...</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyPresetLink(preset)}
                    aria-label={`"${preset.preset_name}" 필터 링크 복사`}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <span className="text-xs sm:text-sm text-muted-foreground">저장된 프리셋이 없습니다.</span>
            )}
          </div>
        </div>

        {/* 검색 및 필터 */}
        <Card>
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">검색 / 필터</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            {/* 검색 */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">검색</label>
              <div className="relative">
                <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  ref={searchRef}
                  placeholder="제목 / 과정 / 강사 검색"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* 필터 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">교육 연도</label>
                <Select value={filters.year ? String(filters.year) : "all"} onValueChange={(v) => handleFilterChange("year", v)}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 연도</SelectItem>
                    {availableYears.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">세션(과정)</label>
                <Select value={filters.sessionId || "all"} onValueChange={(v) => handleFilterChange("sessionId", v)}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-50 bg-background border shadow-md">
                    <SelectItem value="all">모든 세션</SelectItem>
                    {availableSessions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">상태</label>
                <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange("status", v)}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="draft">초안</SelectItem>
                    <SelectItem value="active">진행중</SelectItem>
                    <SelectItem value="public">공개중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="scheduled">시작예정</SelectItem>
                    <SelectItem value="expired">종료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">정렬</label>
                <Select value={`${sortBy}_${sortDir}`} onValueChange={(v) => {
                  const [by, dir] = v.split("_");
                  setSortBy(by as SortBy);
                  setSortDir(dir as SortDir);
                }}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at_desc">생성일 ↓</SelectItem>
                    <SelectItem value="created_at_asc">생성일 ↑</SelectItem>
                    <SelectItem value="start_date_desc">시작일 ↓</SelectItem>
                    <SelectItem value="start_date_asc">시작일 ↑</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border border-dashed bg-muted/40 p-2 sm:p-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">필터 요약</span>
                {filterSummaryItems.length ? (
                  filterSummaryItems.map((item) => (
                    <Badge key={`${item.label}-${item.value}`} variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                      {item.label}: {item.value}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs sm:text-sm text-muted-foreground">모든 설문이 표시됩니다.</span>
                )}
                {activePreset && (
                  <span className="w-full sm:w-auto sm:ml-auto text-[10px] sm:text-xs font-medium text-primary whitespace-nowrap mt-1 sm:mt-0">
                    "{activePreset.preset_name}" 프리셋 적용 중
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={presetModalOpen} onOpenChange={setPresetModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>필터 프리셋 관리</DialogTitle>
              <DialogDescription>
                자주 사용하는 필터 조합을 저장하고 빠르게 불러올 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="filter-preset-name">프리셋 이름</label>
                <Input
                  id="filter-preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="예: 2024년 1차 진행중 설문"
                />
                <p className="text-xs text-muted-foreground">
                  현재 화면에 적용된 필터 조건이 그대로 저장됩니다.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPresetModalOpen(false)}>
                  닫기
                </Button>
                <Button onClick={handleSavePreset} disabled={!presetName.trim() || presetSaving}>
                  {presetSaving ? "저장 중..." : "현재 필터 저장"}
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">저장된 프리셋</h4>
                {presetLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : filterPresets.length ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {filterPresets.map((preset) => {
                      const summary = getSummaryItems(preset.filter_data);
                      return (
                        <div
                          key={preset.id}
                          className={`rounded-lg border p-4 transition-colors ${activePresetId === preset.id ? "border-primary bg-primary/5" : ""
                            }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-medium">{preset.preset_name}</p>
                              {preset.updated_at && (
                                <p className="text-xs text-muted-foreground">
                                  최근 수정: {formatSafeDate(preset.updated_at)}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyPresetLink(preset)}
                                className="flex items-center gap-1"
                              >
                                <Share2 className="h-4 w-4" />
                                링크 복사
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleApplyPreset(preset)}>
                                불러오기
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePreset(preset.id)}
                                aria-label={`"${preset.preset_name}" 프리셋 삭제`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {summary.length ? (
                              summary.map((item) => (
                                <Badge
                                  key={`${preset.id}-${item.label}-${item.value}`}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {item.label}: {item.value}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">모든 설문 표시</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    저장된 프리셋이 없습니다. 현재 필터를 저장해보세요.
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 오류 표시 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 멀티 선택 플로팅 액션바 */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{selected.size}개 선택됨</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportCsvSelected}
                      disabled={selected.size === 0}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      내보내기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const selectedSurveys = surveys.filter(s => selected.has(s.id));
                        const activeCount = selectedSurveys.filter(s => s.status === 'active').length;
                        const inactiveCount = selectedSurveys.length - activeCount;

                        // 대부분이 활성화된 경우 비활성화, 그렇지 않으면 활성화
                        const newStatus = activeCount > inactiveCount ? 'draft' : 'active';
                        handleBulkStatusChange(Array.from(selected), newStatus);
                      }}
                    >
                      {surveys.filter(s => selected.has(s.id) && s.status === 'active').length >
                        surveys.filter(s => selected.has(s.id) && s.status !== 'active').length ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          일괄 비활성화
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          일괄 활성화
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeletingSurveyId(Array.from(selected).join(','));
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(new Set())}
                  >
                    선택 해제
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 설문 목록 */}
        <Card>
          <CardContent className="p-6">
            {/* 전체 선택 헤더 */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                  className="h-8 w-8 p-0"
                >
                  <CheckSquare className={`h-4 w-4 ${allChecked ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selected.size > 0 ? `${selected.size}개 선택됨` : '전체 선택'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseVirtualScroll(!useVirtualScroll)}
                  className="text-sm"
                >
                  {useVirtualScroll ? '일반 보기' : '가상 스크롤'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  총 {totalCount}개 설문
                </span>
              </div>
            </div>

            {/* 가상 스크롤 또는 일반 목록 */}
            {useVirtualScroll && surveys.length > 10 ? (
              <VirtualizedTable
                data={surveys}
                columns={[
                  {
                    key: 'select',
                    title: '선택',
                    width: 60,
                    render: (survey) => (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleOne(survey.id)}
                        className="h-8 w-8 p-0"
                      >
                        <CheckSquare className={`h-4 w-4 ${selected.has(survey.id) ? 'text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                    )
                  },
                  {
                    key: 'title',
                    title: '제목',
                    minWidth: 200,
                    render: (survey) => (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Highlight text={survey.title} query={q} />
                          <Badge variant={getStatusInfo(survey).variant}>
                            {getStatusInfo(survey).label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {survey.course_name} - {survey.education_year}년 {survey.education_round}차 {survey.education_day}일차
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'instructor',
                    title: '강사',
                    width: 150,
                    render: (survey) => (
                      <span className="text-sm">
                        <Highlight text={survey.instructor_name} query={q} />
                      </span>
                    )
                  },
                  {
                    key: 'date',
                    title: '생성일',
                    width: 150,
                    render: (survey) => (
                      <span className="text-sm text-muted-foreground">
                        {formatSafeDate(survey.created_at)}
                      </span>
                    )
                  },
                  {
                    key: 'actions',
                    title: '작업',
                    width: 300,
                    render: (survey) => (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/survey-preview/${survey.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          미리보기
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate(`/survey-detailed-analysis/${survey.id}`, {
                            state: { from: 'survey-management' }
                          })}
                        >
                          <BarChart className="h-4 w-4 mr-1" />
                          분석
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>작업</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              const surveyUrl = getSurveyUrl(survey.id);
                              window.open(`${surveyUrl}?mode=test`, '_blank');
                            }}>
                              <FlaskConical className="h-4 w-4 mr-2" />
                              테스트 모드
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/survey-builder/${survey.id}`)}>
                              <Settings className="h-4 w-4 mr-2" />
                              편집
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setQrSurveyId(survey.id);
                              setQrOpen(true);
                            }}>
                              <QrCode className="h-4 w-4 mr-2" />
                              QR 코드
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const surveyUrl = getSurveyUrl(survey.id);
                              navigator.clipboard.writeText(surveyUrl);
                              toast({
                                title: "링크 복사 완료",
                                description: "설문 링크가 클립보드에 복사되었습니다.",
                              });
                            }}>
                              <Link className="h-4 w-4 mr-2" />
                              링크 복사
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateSurvey(survey.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              복제
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusToggle(survey.id, survey.status)}>
                              {survey.status === 'active' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                              {survey.status === 'active' ? '비활성화' : '활성화'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setDeletingSurveyId(survey.id);
                                setDeleteOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )
                  }
                ]}
                height={600}
                itemHeight={80}
                loading={paginationHook.loading}
                emptyMessage="설문이 없습니다."
              />
            ) : (
              <div className="space-y-4">
                {surveys.map((survey) => (
                  <div key={survey.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleOne(survey.id)}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      <CheckSquare className={`h-4 w-4 ${selected.has(survey.id) ? 'text-primary' : 'text-muted-foreground'}`} />
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">
                          <Highlight text={survey.title} query={q} />
                        </h3>
                        <Badge variant={getStatusInfo(survey).variant}>
                          {getStatusInfo(survey).label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          과정: <Highlight text={survey.course_name} query={q} /> - {survey.education_year}년 {survey.education_round}차 {survey.education_day}일차
                        </div>
                        {survey.instructor_name && (
                          <div>
                            강사: <Highlight text={survey.instructor_name} query={q} />
                          </div>
                        )}
                        <div>생성일: {formatSafeDate(survey.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/survey-preview/${survey.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        미리보기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/survey-detailed-analysis/${survey.id}`, {
                          state: { from: 'survey-management' }
                        })}
                      >
                        <BarChart className="h-4 w-4 mr-1" />
                        분석
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>작업</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            const surveyUrl = getSurveyUrl(survey.id);
                            window.open(`${surveyUrl}?mode=test`, '_blank');
                          }}>
                            <FlaskConical className="h-4 w-4 mr-2" />
                            테스트 모드
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/survey-builder/${survey.id}`)}>
                            <Settings className="h-4 w-4 mr-2" />
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setQrSurveyId(survey.id);
                            setQrOpen(true);
                          }}>
                            <QrCode className="h-4 w-4 mr-2" />
                            QR 코드
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const surveyUrl = getSurveyUrl(survey.id);
                            navigator.clipboard.writeText(surveyUrl);
                            toast({
                              title: "링크 복사 완료",
                              description: "설문 링크가 클립보드에 복사되었습니다.",
                            });
                          }}>
                            <Link className="h-4 w-4 mr-2" />
                            링크 복사
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateSurvey(survey.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            복제
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusToggle(survey.id, survey.status)}>
                            {survey.status === 'active' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                            {survey.status === 'active' ? '비활성화' : '활성화'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setDeletingSurveyId(survey.id);
                              setDeleteOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            <PaginationControls
              page={currentPage}
              pageSize={paginationHook.pagination.pageSize}
              total={paginationHook.pagination.total}
              totalPages={paginationHook.pagination.totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                paginationHook.goToPage(page);
              }}
              onPageSizeChange={(size) => {
                setCurrentPage(1);
                paginationHook.setPageSize(size);
              }}
              loading={paginationHook.loading}
              className="mt-6"
            />
          </CardContent>
        </Card>

        {/* 빠른 생성 다이얼로그 */}
        <QuickCreateDialog
          open={quickOpen}
          onOpenChange={setQuickOpen}
          years={availableYears}
          courseNames={availablePrograms}
          templates={templates}
          defaultYear={new Date().getFullYear()}
          onCreate={handleQuickCreate}
        />

        {/* 설문 생성 시트 */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl overflow-y-auto"
            style={{ maxHeight: '100vh' }}
          >
            <SheetHeader>
              <SheetTitle>새 설문 생성</SheetTitle>
              <SheetDescription>
                새로운 설문을 생성합니다.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 pb-6">
              <SurveyCreateForm
                onSuccess={(surveyId) => {
                  setCreateOpen(false);
                  navigate(`/survey-builder/${surveyId}`);
                }}
                templates={templates}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>설문 삭제</DialogTitle>
              <DialogDescription>
                {deletingSurveyId?.includes(',')
                  ? `선택한 ${deletingSurveyId.split(',').length}개 설문을 삭제하시겠습니까?`
                  : '정말로 이 설문을 삭제하시겠습니까?'
                } 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleDeleteSurvey}>
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QR 코드 다이얼로그 */}
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>QR 코드</DialogTitle>
              <DialogDescription>
                설문 참여용 QR 코드입니다.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {qrSurveyId && (
                <div className="p-4 bg-white rounded-lg border">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getSurveyUrl(qrSurveyId))}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              )}
              <div className="text-sm text-center space-y-2">
                <p>참여자가 이 QR 코드를 스캔하여 설문에 참여할 수 있습니다.</p>
                <p className="text-muted-foreground break-all">
                  {getSurveyUrl(qrSurveyId!)}
                </p>
              </div>
              <div className="flex space-x-2 w-full">
                <Button
                  onClick={() => handleCopyLink(qrSurveyId!)}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  링크 복사
                </Button>
                <Button
                  onClick={() => handleDownloadQR(qrSurveyId!)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  QR 다운로드
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}