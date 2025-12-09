import React from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, LogOut } from "lucide-react";


interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon }: PageHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-surface-border/50 bg-gradient-soft/90 supports-[backdrop-filter]:bg-gradient-soft/80 backdrop-blur-sm sticky top-0 z-40 shadow-neumorphic-soft transition-colors h-14">
      <div className="container mx-auto px-3 sm:px-4 h-full flex justify-between items-center relative">
        {/* Left: Sidebar Trigger */}
        <div className="flex items-center shrink-0 z-10">
          <SidebarTrigger className="h-9 w-9 rounded-xl shadow-neumorphic-soft hover:shadow-neumorphic bg-sidebar-accent/50 border border-sidebar-border/50 shrink-0" />
        </div>

        {/* Center: Title - Absolutely Centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center max-w-[60%] w-full pointer-events-none">
          <div className="flex items-center justify-center gap-2 pointer-events-auto">
            <div className="h-8 w-8 bg-gradient-primary rounded-xl flex items-center justify-center shadow-purple-glow shrink-0 hidden sm:flex">
              {icon || <BarChart3 className="h-4 w-4 text-primary-foreground" />}
            </div>
            <h1 className="text-sm sm:text-base md:text-lg font-bold bg-gradient-primary bg-clip-text text-transparent truncate leading-tight text-center">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-sidebar-muted-foreground truncate hidden sm:block max-w-full text-center pointer-events-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: User & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          <span className="text-xs md:text-sm text-sidebar-muted-foreground hidden lg:block font-medium truncate max-w-[120px] xl:max-w-none">
            {user?.email}
          </span>
          <Button
            onClick={signOut}
            variant="outline"
            size="sm"
            className="rounded-xl shadow-neumorphic-soft border-sidebar-border/50 bg-sidebar-accent/50 hover:bg-sidebar-accent hover:shadow-neumorphic text-sidebar-foreground h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 shrink-0"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </div>
    </header>
  );
}