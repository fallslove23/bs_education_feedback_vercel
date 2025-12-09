import React from "react";

interface SubNavigationProps {
  children: React.ReactNode;
}

export function SubNavigation({ children }: SubNavigationProps) {
  return (
    <div className="border-b bg-white/95 dark:bg-background/95 dark:border-border backdrop-blur-sm sticky top-[52px] sm:top-16 z-30 shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2 md:py-3">
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 overflow-x-auto touch-scroll pb-1 -mb-1 scrollbar-hide">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-max">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}