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

        // Delete existing records for this class and date to avoid duplicates
        await prisma.attendanceRecord.deleteMany({
            where: {
                classId,
                date,
            },
        });

        // Bulk create new records
        const newRecords = await prisma.attendanceRecord.createMany({
            data: studentStatus.map((status) => ({
                classId,
                studentId: status.studentId,
                date,
                status: status.present ? 'presente' : 'ausente',
            })),
        });

        return NextResponse.json({ success: true, count: newRecords.count });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
        }
        console.error('Error recording attendance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
