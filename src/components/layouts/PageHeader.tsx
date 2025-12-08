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
    <header className="border-b border-surface-border/50 bg-gradient-soft/90 supports-[backdrop-filter]:bg-gradient-soft/80 backdrop-blur-sm sticky top-0 z-40 shadow-neumorphic-soft transition-colors">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-neumorphic-soft hover:shadow-neumorphic bg-sidebar-accent/50 border border-sidebar-border/50 shrink-0" />
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-purple-glow shrink-0">
            {icon || <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] sm:text-xs md:text-sm text-sidebar-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs md:text-sm text-sidebar-muted-foreground hidden lg:block font-medium truncate max-w-[120px] xl:max-w-none">
            {user?.email}
          </span>
          <Button 
            onClick={signOut} 
            variant="outline" 
            size="sm"
            className="rounded-xl shadow-neumorphic-soft border-sidebar-border/50 bg-sidebar-accent/50 hover:bg-sidebar-accent hover:shadow-neumorphic text-sidebar-foreground h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </div>
    </header>
  );
}