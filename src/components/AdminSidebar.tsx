// src/components/AdminSidebar.tsx
import { NavLink, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  UserCheck,
  BookOpen,
  FileText,
  Mail,
  Settings,
  TrendingUp,
  Award,
  PieChart,
  Database,
  Code,
  Shield,
  Building2,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

export function AdminSidebar() {
  const { userRoles, user } = useAuth();
  const [searchParams] = useSearchParams();

  const viewMode = searchParams.get('view'); // URL에서 view 파라미터 읽기
  const isAdmin = userRoles.includes('admin');
  const isInstructor = userRoles.includes('instructor');
  const isOperator = userRoles.includes('operator');
  const isDeveloper = user?.email === 'sethetrend87@osstem.com';
  const isMobile = useIsMobile();

  type MenuItem = {
    title: string;
    url: string;
    icon: LucideIcon;
    exact: boolean;
    badge?: string;
  };

  type MenuSection = {
    title: string;
    items: MenuItem[];
  };

  // 역할 기반 메뉴 구조 - 사용자가 가진 모든 역할의 메뉴를 표시
  const getMenuItems = (): MenuSection[] => {
    const sections: MenuSection[] = [];
    
    // 관리자/운영자는 조직 전체 메뉴 접근
    const hasAdminAccess = isAdmin || isOperator;
    
    if (hasAdminAccess) {
      sections.push(
        {
          title: "조직 개요",
          items: [
            { title: "대시보드", url: "/dashboard", icon: Building2, exact: true }
          ]
        },
        {
          title: "조직 분석", 
          items: [
            { title: "결과분석", url: "/dashboard/results", icon: BarChart3, exact: false },
            { title: "과정별 결과 보고", url: "/dashboard/course-reports", icon: TrendingUp, exact: false },
            { title: "과정 전체 통계", url: "/dashboard/course-statistics", icon: PieChart, exact: false },
            { title: "누적 데이터", url: "/dashboard/cumulative-data", icon: Database, exact: false }
          ]
        },
        {
          title: "운영 관리",
          items: [
            { title: "설문관리", url: "/surveys-v2", icon: FileText, exact: false },
            { title: "템플릿관리", url: "/dashboard/templates", icon: FileText, exact: false },
            { title: "강사관리", url: "/dashboard/instructors", icon: UserCheck, exact: false },
            ...(isAdmin ? [{ title: "사용자관리", url: "/dashboard/users", icon: Users, exact: false }] : []),
            { title: "강의 과목 관리", url: "/dashboard/courses", icon: BookOpen, exact: false }
          ]
        },
        {
          title: "감사 로그",
          items: [
            { title: "이메일 로그", url: "/dashboard/email-logs", icon: Mail, exact: false },
            { title: "시스템 로그", url: "/dashboard/system-logs", icon: Settings, exact: false },
            { title: "정책 관리", url: "/dashboard/policy-management", icon: Shield, exact: false }
          ]
        }
      );
    }

    // 강사 역할이 있으면 "나의 분석" 섹션 추가
    if (isInstructor) {
      sections.push({
        title: "나의 분석",
        items: [
          { title: "나의 만족도 통계", url: "/dashboard/my-stats", icon: Award, exact: false, badge: "내 데이터만" },
          { title: "과정별 내 결과", url: "/dashboard/results", icon: TrendingUp, exact: false, badge: "강사만" },
          { title: "과정 전체 통계", url: "/dashboard/course-statistics", icon: PieChart, exact: false, badge: "요약만" }
        ]
      });
    }

    // 강사 전용 모드 (관리자 권한 없는 강사)
    if (!hasAdminAccess && isInstructor) {
      // 강사는 대시보드만 추가로 접근
      sections.unshift({
        title: "조직 개요",
        items: [
          { title: "대시보드", url: "/dashboard", icon: Building2, exact: true }
        ]
      });
    }

    return sections;
  };

  const menuItems = getMenuItems();
  const location = useLocation();
  const currentPath = location.pathname;
  const isItemActive = (item: MenuItem) => (item.exact ? currentPath === item.url : currentPath.startsWith(item.url));

  const renderMenuItem = (
    item: MenuItem,
    options: { variant?: "default" | "developer" } = {}
  ) => {
    const { variant = "default" } = options;
    
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={isItemActive(item)}
          className={cn(
            "rounded-xl transition-all duration-200",
            "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-purple-glow",
            variant === "developer"
              ? "text-destructive hover:bg-destructive/10 hover:text-destructive data-[active=true]:bg-destructive data-[active=true]:text-destructive-foreground shadow-neumorphic-soft"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground hover:shadow-neumorphic-soft"
          )}
        >
          <NavLink to={item.url} end={item.exact}>
            {(() => {
              const active = isItemActive(item);
              return (
                <>
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-200",
                      active ? "text-primary-foreground" : "text-sidebar-foreground"
                    )}
                  />
                  <span className={cn(
                    "truncate leading-5 flex-1 font-medium",
                    active ? "text-primary-foreground font-semibold" : "text-sidebar-foreground"
                  )}>{item.title}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[0.6rem] h-4 px-1.5 ml-auto font-medium",
                        active 
                          ? "bg-primary-foreground/20 text-primary-foreground border-0 font-semibold" 
                          : "bg-sidebar-primary/10 text-sidebar-primary border-sidebar-primary/20"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              );
            })()}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

    return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "none"} className="border-r border-sidebar-border/50 bg-sidebar shadow-neumorphic">
      <SidebarContent className="bg-gradient-soft px-3 py-6 text-sidebar-foreground sidebar-scroll">
        <div className="space-y-6">
          {menuItems.map((section) => (
            <SidebarGroup key={section.title} className="space-y-3">
              <SidebarGroupLabel className="px-3 text-[0.7rem] font-semibold uppercase tracking-widest text-sidebar-foreground">
                {section.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {section.items.map((item) => renderMenuItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-sidebar-muted-foreground">테마</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}