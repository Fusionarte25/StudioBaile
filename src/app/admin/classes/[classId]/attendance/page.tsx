
'use client';

import { AttendanceSheet } from '@/components/shared/attendance-sheet';
import { useParams, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

export default function AdminClassAttendancePage() {
  const params = useParams();
  const classId = params.classId as string;
  
  // For admin, we can default to today if no date is passed,
  // as they might be taking attendance for a one-off class today.
  const today = format(new Date(), 'yyyy-MM-dd');
  const date = useSearchParams().get('date') || today;

  if (!classId) {
    return <div>Cargando...</div>;
  }

  return <AttendanceSheet classId={classId} date={date} userRole="Admin" />;
}
