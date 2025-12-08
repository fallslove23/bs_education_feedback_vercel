import { ReactNode } from 'react';
import { VariantProps } from 'class-variance-authority';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogAction extends VariantProps<typeof buttonVariants> {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  primaryAction: ConfirmDialogAction;
  secondaryAction?: ConfirmDialogAction;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  primaryAction,
  secondaryAction,
}: ConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            typeof description === 'string' ? (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">{description}</div>
            )
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={secondaryAction?.onClick}
            className={cn(
              buttonVariants({ variant: secondaryAction?.variant ?? 'outline' }),
              secondaryAction?.className
            )}
            disabled={secondaryAction?.disabled}
          >
            {secondaryAction?.label ?? '취소'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={primaryAction.onClick}
            className={cn(
              buttonVariants({ variant: primaryAction.variant ?? 'default' }),
              primaryAction.className
            )}
            disabled={primaryAction.disabled}
          >
            {primaryAction.label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

