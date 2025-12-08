import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileOptimizedContainerProps {
  children: ReactNode
  className?: string
  enableScroll?: boolean
  safeArea?: boolean
}

export function MobileOptimizedContainer({ 
  children, 
  className,
  enableScroll = true,
  safeArea = true
}: MobileOptimizedContainerProps) {
  return (
    <div 
      className={cn(
        "w-full h-full",
        enableScroll && "touch-scroll mobile-scroll",
        safeArea && "safe-top safe-bottom",
        className
      )}
    >
      {children}
    </div>
  )
}