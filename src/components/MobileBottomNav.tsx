import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Award,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const { userRoles } = useAuth();
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();

  if (!isMobile) return null;

  const isAdmin = userRoles.includes('admin');
  const isOperator = userRoles.includes('operator');
  const isInstructor = userRoles.includes('instructor');
  const hasAdminAccess = isAdmin || isOperator;

  // 역할별 탭 메뉴
  const getTabItems = () => {
    if (hasAdminAccess) {
      return [
        { title: "대시보드", url: "/dashboard", icon: LayoutDashboard, exact: true },
        { title: "결과분석", url: "/dashboard/results", icon: BarChart3, exact: false },
        { title: "설문관리", url: "/surveys-v2", icon: FileText, exact: false },
      ];
    } else if (isInstructor) {
      return [
        { title: "대시보드", url: "/dashboard", icon: LayoutDashboard, exact: true },
        { title: "나의 통계", url: "/dashboard/my-stats", icon: Award, exact: false },
        { title: "결과분석", url: "/dashboard/results", icon: BarChart3, exact: false },
      ];
    }
    return [];
  };

  const tabItems = getTabItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm shadow-neumorphic-soft safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "text-primary"
                  )}
                />
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "text-primary font-semibold"
                )}>
                  {item.title}
                </span>
              </>
            )}
          </NavLink>
        ))}
        
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">메뉴</span>
        </button>
      </div>
    </nav>
  );
}
