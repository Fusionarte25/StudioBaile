
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Perform all queries in parallel to minimize total latency
    // This reduces the number of round trips from the client to the server
    // and from the server to the database.
    const [
      users,
      classes,
      membershipPlans,
      studentMemberships,
      studentPayments,
      transactions,
      levels,
      styles
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.danceClass.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          day: true,
          date: true,
          time: true,
          room: true,
          duration: true,
          capacity: true,
          status: true,
          styleId: true,
          levelId: true,
          teachers: { select: { id: true } },
          enrolledStudents: { select: { id: true } }
        }
      }),
      prisma.membershipPlan.findMany(),
      prisma.studentMembership.findMany(),
      prisma.studentPayment.findMany(),
      prisma.transaction.findMany(),
      prisma.danceLevel.findMany(),
      prisma.danceStyle.findMany()
    ]);

    // Map classes to includes similar to the dedicated classes API
    const classesFormatted = (classes as any[]).map((c: any) => {
      const explicitStudentIds = c.enrolledStudents.map((s: any) => s.id);
      
      // Also include students who have this class ID in their active membership
      const membershipStudentIds: number[] = [];
      studentMemberships.forEach((m: any) => {
        try {
          const classIds = JSON.parse(m.selectedClassIds || '[]');
          if (Array.isArray(classIds) && classIds.includes(c.id)) {
            membershipStudentIds.push(m.userId);
          }
        } catch (e) {}
      });

      // Unique merge
      const allStudentIds = Array.from(new Set([...explicitStudentIds, ...membershipStudentIds]));

      return {
        ...c,
        teacherIds: (c.teachers as any[]).map((t: any) => t.id),
        enrolledStudentIds: allStudentIds,
      };
    });

    return NextResponse.json({
      users,
      danceClasses: classesFormatted,
      membershipPlans,
      studentMemberships,
      studentPayments,
      transactions,
      levels,
      styles
    });
  } catch (error) {
    console.error('[CONSOLIDATED_DATA_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
