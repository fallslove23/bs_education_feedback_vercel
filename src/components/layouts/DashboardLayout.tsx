import React from "react";
import { BaseLayout } from "./BaseLayout";
import { PageHeader } from "./PageHeader";
import { SubNavigation } from "./SubNavigation";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  description?: string;
  totalCount?: number;
  actions?: React.ReactNode | React.ReactNode[];
  loading?: boolean;
  icon?: React.ReactNode;
  hideHeader?: boolean;
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const {
    children,
    title,
    subtitle,
    description,
    totalCount,
    actions,
    loading = false,
    icon,
    hideHeader = false,
  } = props;

  const actionItems = toArray(actions);
  const subline = description ?? subtitle;

  const renderSubNavigation = () => {
    if (!actionItems.length) return null;
    
    return (
      <SubNavigation>
        {actionItems.map((action, index) => (
          <div key={`action-${index}`}>{action}</div>
        ))}
      </SubNavigation>
    );
  };

  return (
    <BaseLayout>
      {!hideHeader && (
        <PageHeader
          title={title}
          subtitle={subtitle || description}
          icon={icon}
        />
      )}
      
      {renderSubNavigation()}
      
      <div className="flex-1 overflow-auto touch-scroll">
        <div className="container mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6 max-w-none">
          {(subline || typeof totalCount === "number") && (
            <div className="mb-2 sm:mb-3 md:mb-4">
              <p className="text-xs sm:text-sm text-muted-foreground px-1">
                {subline}
                {typeof totalCount === "number" && ` - 전체 ${totalCount}개`}
              </p>
            </div>
          )}
          {children}
        </div>
      </div>
    </BaseLayout>
  );
}