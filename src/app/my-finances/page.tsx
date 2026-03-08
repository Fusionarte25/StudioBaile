
'use client';

import { useAuth } from '@/context/auth-context';
import { TeacherPayroll } from '@/components/admin/teacher-payroll';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyFinancesPage() {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return (
        <div className="p-4 md:p-8 space-y-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-80 w-full" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Mis Finanzas</h1>
        <div className="text-right">
            <p className="font-bold text-lg">{currentUser.name}</p>
            <p className="text-sm text-muted-foreground">{currentUser.role}</p>
        </div>
      </div>
      <TeacherPayroll mode="teacher_income" teacherId={currentUser.id} />
    </div>
  );
}
