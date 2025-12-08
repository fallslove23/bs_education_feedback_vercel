import React from 'react';
import { AlertTriangle, CircleHelp, LifeBuoy, Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGateFallbackProps {
  helpHref: string;
  supportHref: string;
  onRetry?: () => void;
  timeoutMs?: number;
}

const PermissionGateFallback: React.FC<PermissionGateFallbackProps> = ({
  helpHref,
  supportHref,
  onRetry,
  timeoutMs = 12000,
}) => {
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = window.setTimeout(() => setHasTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [timeoutMs]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted/40 px-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/60 bg-card/90 p-8 text-center shadow-2xl backdrop-blur-lg">
        {hasTimedOut ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-9 w-9 text-destructive" aria-hidden="true" />
            </div>
            <div className="space-y-2" aria-live="polite">
              <h2 className="text-2xl font-semibold tracking-tight">권한 확인이 지연되고 있어요</h2>
              <p className="leading-relaxed text-sm text-muted-foreground">
                요청이 예상보다 오래 걸리고 있습니다. 네트워크 상태를 확인하거나 다시 로그인해 주세요.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {onRetry && (
                <Button onClick={onRetry} size="lg" className="gap-2">
                  <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                  다시 로그인하기
                </Button>
              )}
              <a
                href={supportHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                문의하기
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-9 w-9 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-2" aria-live="polite">
              <h2 className="text-2xl font-semibold tracking-tight">권한 확인 중</h2>
              <p className="leading-relaxed text-sm text-muted-foreground">
                안전한 이용을 위해 계정 권한을 확인하고 있습니다. 잠시만 기다려 주세요.
              </p>
            </div>
            <div className="space-y-3" role="status" aria-live="polite">
              <div className="mx-auto flex w-full max-w-[220px] items-center justify-center gap-2 rounded-full bg-primary/5 px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">Verifying access</span>
              </div>
              <div className="space-y-2">
                <Skeleton className="mx-auto h-3 w-5/6" />
                <Skeleton className="mx-auto h-3 w-2/3" />
                <Skeleton className="mx-auto h-3 w-4/6" />
              </div>
            </div>
            <a
              href={helpHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              권한 확인 도움말
            </a>
            <p className="text-xs text-muted-foreground">최대 10초 정도 소요될 수 있어요.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PermissionGateFallback;
