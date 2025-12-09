import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { LayoutProvider } from "./LayoutProvider";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface BaseLayoutProps {
  children: React.ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <LayoutProvider>
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="flex h-screen w-full bg-background overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 flex flex-col min-w-0 w-full h-full overflow-hidden">
            <div className="w-full h-full flex flex-col pb-16 md:pb-0">
              {children}
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </SidebarProvider>
    </LayoutProvider>
  );
}