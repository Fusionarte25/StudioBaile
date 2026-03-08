
'use client';

import { AttendanceSheet } from '@/components/shared/attendance-sheet';
import { useParams, useSearchParams } from 'next/navigation';

export default function TeacherClassAttendancePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const classId = params.classId as string;
  const date = searchParams.get('date');

  if (!classId || !date) {
    return <div>Cargando...</div>;
  }

  return <AttendanceSheet classId={classId} date={date} userRole="Profesor" />;
}
