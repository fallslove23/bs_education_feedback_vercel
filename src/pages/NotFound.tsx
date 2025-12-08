import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import SupportContactInfo, {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_SURVEY_CONTACT,
} from "@/components/SupportContactInfo";
import {
  Home,
  ArrowLeft,
  AlertCircle,
  Search,
  LayoutDashboard,
  ClipboardList,
  Users,
  BarChart3,
  FileText,
} from "lucide-react";

const quickLinks = [
  {
    title: "대시보드",
    description: "전체 운영 현황과 주요 지표를 확인합니다.",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "설문 관리",
    description: "설문을 생성하고 배포 상태를 관리합니다.",
    path: "/dashboard/surveys",
    icon: ClipboardList,
  },
  {
    title: "강사 관리",
    description: "강사 정보를 확인하고 권한을 조정합니다.",
    path: "/dashboard/instructors",
    icon: Users,
  },
  {
    title: "강의 리포트",
    description: "강의별 설문 리포트를 빠르게 확인합니다.",
    path: "/dashboard/course-reports",
    icon: BarChart3,
  },
  {
    title: "템플릿 관리",
    description: "설문 템플릿을 생성하고 편집합니다.",
    path: "/dashboard/templates",
    icon: FileText,
  },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.sessionStorage.getItem("recentPaths");
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      const filtered = parsed
        .filter((path) => path && path !== currentPath)
        .slice(0, 5);
      setRecentPages(filtered);
    } catch (storageError) {
      console.error("최근 방문 페이지를 불러오지 못했습니다", storageError);
      setRecentPages([]);
    }
  }, [currentPath]);

  const handleGoHome = () => {
    // 관리자 대시보드에서 온 경우 대시보드로, 그 외에는 메인으로
    if (location.pathname.includes('/dashboard')) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const filteredQuickLinks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return quickLinks;
    }

    return quickLinks.filter((link) =>
      [link.title, link.description]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [searchTerm]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (filteredQuickLinks.length > 0) {
      navigate(filteredQuickLinks[0].path);
    }
  };

  const getRecentPageLabel = (path: string) => {
    const quickLinkMatch = quickLinks.find((link) => path.startsWith(link.path));
    if (quickLinkMatch) {
      return quickLinkMatch.title;
    }

    if (path === "/") {
      return "메인 페이지";
    }

    if (path.startsWith("/survey-session")) {
      return "설문 참여 세션";
    }

    if (path.startsWith("/survey/")) {
      return "설문 참여";
    }

    if (path.startsWith("/results")) {
      return "설문 결과";
    }

    if (path.startsWith("/auth")) {
      return "로그인";
    }

    return path;
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 text-foreground overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20 opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-gradient-primary blur-3xl opacity-20"
        aria-hidden="true"
      />
      <Card className="relative z-10 w-full max-w-2xl mx-auto shadow-lg border border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardContent className="p-8 space-y-8">
          {/* 404 아이콘 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display">404</h1>
              <h2 className="text-lg md:text-xl font-semibold text-foreground font-display">
                페이지를 찾을 수 없습니다
              </h2>
              <p className="text-sm md:text-base text-muted-foreground font-sans break-words">
                요청하신 페이지가 존재하지 않거나 이동되었습니다.
              </p>
            </div>

            <div className="bg-muted rounded-lg p-3 inline-flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-mono break-all">
                경로: {currentPath || location.pathname}
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="text-left">
                  <h3 className="text-base font-semibold text-foreground">빠른 탐색</h3>
                  <p className="text-sm text-muted-foreground">
                    찾으시는 기능이나 페이지를 검색해 보세요.
                  </p>
                </div>
                <div className="hidden sm:flex gap-2">
                  <Button onClick={handleGoHome} size="sm">
                    <Home className="w-4 h-4 mr-2" />
                    홈으로 이동
                  </Button>
                  <Button onClick={handleGoBack} variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    이전 페이지
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSearchSubmit} className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="메뉴, 기능 또는 페이지명을 입력하세요"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Enter 키를 눌러 가장 적합한 페이지로 이동합니다.
                </p>
              </form>

              <div className="grid gap-2">
                <h4 className="text-sm font-semibold text-foreground">최근 방문 페이지</h4>
                {recentPages.length > 0 ? (
                  <div className="grid gap-2">
                    {recentPages.map((path) => (
                      <Button
                        key={path}
                        variant="outline"
                        className="justify-between text-left"
                        onClick={() => navigate(path)}
                      >
                        <span className="font-medium text-sm">{getRecentPageLabel(path)}</span>
                        <span className="ml-4 text-xs text-muted-foreground truncate max-w-[12rem]">
                          {path}
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    아직 방문 기록이 없습니다. 홈으로 이동해 탐색을 시작해 보세요.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <h4 className="text-sm font-semibold text-foreground">주요 기능 바로가기</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredQuickLinks.length > 0 ? (
                  filteredQuickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Button
                        key={link.path}
                        variant="secondary"
                        className="justify-start text-left h-auto py-3"
                        onClick={() => navigate(link.path)}
                      >
                        <Icon className="w-4 h-4 mr-3 text-primary" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-semibold text-foreground">
                            {link.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {link.description}
                          </span>
                        </div>
                      </Button>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    검색어와 일치하는 기능을 찾을 수 없습니다. 다른 검색어를 시도해 보세요.
                  </p>
                )}
              </div>
            </div>
          </div>

          <SupportContactInfo
            adminEmail={DEFAULT_ADMIN_EMAIL}
            surveyContact={DEFAULT_SURVEY_CONTACT}
            className="border-dashed"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;