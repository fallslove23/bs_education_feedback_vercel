import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Instructor {
  id: string;
  name: string;
  email?: string;
  photo_url?: string;
  bio?: string;
}

interface InstructorInfoSectionProps {
  instructor: Instructor | null;
  title?: string;
  className?: string;
}

export const InstructorInfoSection: React.FC<InstructorInfoSectionProps> = ({
  instructor,
  title = "강사 정보",
  className,
}) => {
  if (!instructor) {
    return null;
  }

  return (
    <Card className={cn("mb-6 border-primary/20", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
            <AvatarImage 
              src={instructor.photo_url} 
              alt={instructor.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-10 w-10 sm:h-12 sm:w-12" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-xl font-medium text-foreground">{instructor.name}</h3>
            {instructor.email && (
              <p className="text-sm text-muted-foreground mt-1">{instructor.email}</p>
            )}
            {instructor.bio && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {instructor.bio}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};