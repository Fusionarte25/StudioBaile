export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const attendanceSchema = z.object({
    classId: z.string(),
    date: z.string(), // YYYY-MM-DD
    studentStatus: z.array(z.object({
        studentId: z.number(),
        present: z.boolean(),
    })),
});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');

    try {
        const where: any = {};
        if (classId) where.classId = classId;
        if (date) where.date = date;

        const records = await prisma.attendanceRecord.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        return NextResponse.json(records);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { classId, date, studentStatus } = attendanceSchema.parse(body);

        // 1. Get existing records to check for changes
        const existingRecords = await prisma.attendanceRecord.findMany({
            where: { classId, date },
        });

        // 2. Process changes in a transaction
        await prisma.$transaction(async (tx) => {
            for (const status of studentStatus) {
                const oldRecord = existingRecords.find(r => r.studentId === status.studentId);
                const wasPresent = oldRecord?.status === 'presente';
                const isNowPresent = status.present;

                if (isNowPresent && !wasPresent) {
                    // Mark as present: Decrement classes if applicable
                    const membership = await tx.studentMembership.findFirst({
                        where: {
                            userId: status.studentId,
                            startDate: { lte: date },
                            endDate: { gte: date },
                        }
                    });

                    if (membership && membership.classesRemaining !== null && membership.classesRemaining > 0) {
                        await tx.studentMembership.update({
                            where: { id: membership.id },
                            data: { classesRemaining: { decrement: 1 } }
                        });
                    }
                } else if (!isNowPresent && wasPresent) {
                    // Mark as absent (reverting): Increment classes if applicable
                    const membership = await tx.studentMembership.findFirst({
                        where: {
                            userId: status.studentId,
                            startDate: { lte: date },
                            endDate: { gte: date },
                        }
                    });

                    if (membership && membership.classesRemaining !== null) {
                        await tx.studentMembership.update({
                            where: { id: membership.id },
                            data: { classesRemaining: { increment: 1 } }
                        });
                    }
                }
            }

            // 3. Delete existing records for this class and date
            await tx.attendanceRecord.deleteMany({
                where: { classId, date },
            });

            // 4. Create new records
            if (studentStatus.length > 0) {
                await tx.attendanceRecord.createMany({
                    data: studentStatus.map((status) => ({
                        classId,
                        studentId: status.studentId,
                        date,
                        status: status.present ? 'presente' : 'ausente',
                    })),
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
        }
        console.error('Error recording attendance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
