import { Badge } from '@/components/ui/badge';

interface SatisfactionStatusBadgeProps {
  score: number;
}

export const SatisfactionStatusBadge = ({ score }: SatisfactionStatusBadgeProps) => {
  const getStatus = (score: number) => {
    if (score >= 8.0) return { label: '우수', variant: 'default' as const };
    if (score >= 6.0) return { label: '보통', variant: 'secondary' as const };
    return { label: '개선 필요', variant: 'destructive' as const };
  };

  const status = getStatus(score);

  return (
    <Badge variant={status.variant} className="font-medium">
      {status.label}
    </Badge>
  );
};