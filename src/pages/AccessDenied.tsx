import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  operator: "운영자",
  instructor: "강사",
  director: "책임자",
};

const AccessDenied = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const from = searchParams.get("from") ?? "";
  const requiredRolesParam = searchParams.get("required") ?? "";

  const requiredRoles = useMemo(
    () =>
      requiredRolesParam
        .split(",")
        .map((role) => role.trim())
        .filter((role) => role.length > 0),
    [requiredRolesParam]
  );

  const contactEmail =
    import.meta.env.VITE_ADMIN_CONTACT_EMAIL ?? "support@example.com";
  const contactName = import.meta.env.VITE_ADMIN_CONTACT_NAME ?? "시스템 관리자";

  const requiredRoleLabels =
    requiredRoles.length > 0
      ? requiredRoles.map((role) => ROLE_LABELS[role] ?? role).join(", ")
      : "필요 권한";

  const mailSubject = `[권한요청] ${requiredRoleLabels}`;
  const mailBodyLines = [
    "안녕하세요.",
    "",
    "다음 페이지 접근 권한을 요청드립니다:",
  ];

  if (from) {
    mailBodyLines.push(`- 요청 경로: ${from}`);
  }

  if (requiredRoles.length > 0) {
    mailBodyLines.push(
      `- 필요 권한: ${requiredRoles
        .map((role) => ROLE_LABELS[role] ?? role)
        .join(", ")}`
    );
  }

  mailBodyLines.push("", "확인 부탁드립니다.", "", "감사합니다.");

  const mailtoLink = `mailto:${contactEmail}?subject=${encodeURIComponent(
    mailSubject
  )}&body=${encodeURIComponent(mailBodyLines.join("\n"))}`;

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/");
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
        <CardHeader className="space-y-4 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-foreground font-display">
            접근 권한이 필요합니다
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground font-sans">
            요청하신 페이지에 접근하기 위한 권한이 부족합니다. 아래 정보를 확인하고 관리자에게 권한을 요청해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {from && (
            <div className="bg-muted/60 border border-border/50 rounded-lg p-4 text-left">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                요청한 경로
              </p>
              <p className="font-mono text-sm break-all text-foreground/90">{from}</p>
            </div>
          )}

          {requiredRoles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">필요 권한</p>
              <div className="flex flex-wrap gap-2">
                {requiredRoles.map((role) => (
                  <Badge key={role} variant="secondary" className="px-3 py-1 text-sm">
                    {ROLE_LABELS[role] ?? role}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border/60 bg-background/80 p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">관리자 연락처</p>
            <p className="text-sm text-muted-foreground">
              {contactName} · {contactEmail}
            </p>
            <p className="text-xs text-muted-foreground">
              권한 요청 시 필요한 페이지 정보와 역할을 함께 전달해주시면 빠르게 도와드릴 수 있습니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="font-sans">
              <a href={mailtoLink}>
                <Mail className="w-4 h-4 mr-2" />
                권한 요청하기
              </a>
            </Button>
            <Button
              onClick={handleGoBack}
              variant="outline"
              size="lg"
              className="font-sans"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              이전 페이지로 돌아가기
            </Button>
            <Button
              onClick={handleGoHome}
              variant="ghost"
              size="lg"
              className="font-sans"
            >
              <Home className="w-4 h-4 mr-2" />
              메인으로 이동
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            이미 권한을 부여받은 경우 다시 로그인하여 권한 정보를 갱신해주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
