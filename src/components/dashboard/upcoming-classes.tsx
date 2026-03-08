
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DanceClass, User } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Calendar } from 'lucide-react';

export function UpcomingClasses({ classes = [], allUsers = [] }: { classes?: DanceClass[], allUsers?: User[] }) {
  const upcoming = classes.slice(0, 3);
  const getFirstTeacher = (ids: number[]) => allUsers.find(u => ids.includes(u.id));

  if (upcoming.length === 0) {
    return (
        <div className="text-center text-sm text-muted-foreground py-4">
            <Calendar className="mx-auto h-8 w-8 mb-2" />
            <p>No tienes clases próximas.</p>
        </div>
    )
  }

  return (
    <div className="space-y-4">
      {upcoming.map((c) => {
        const firstTeacher = getFirstTeacher(c.teacherIds);
        return (
          <div key={c.id} className="flex items-center">
            <Avatar className="h-10 w-10">
              <AvatarImage src={firstTeacher?.avatar} alt={firstTeacher?.name} />
              <AvatarFallback>{firstTeacher?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.day} a las {c.time}</p>
            </div>
            <div className="ml-auto text-sm text-right">
                <Badge variant="outline" className="font-normal">{c.levelId}</Badge>
            </div>
          </div>
        )
      })}
    </div>
  );
}
