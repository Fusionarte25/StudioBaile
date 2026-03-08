
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const classSchema = z.object({
  name: z.string(),
  type: z.string(),
  time: z.string(),
  room: z.string(),
  duration: z.string(),
  teacherIds: z.array(z.number()),
  styleId: z.string(),
  levelId: z.string(),
  capacity: z.number(),
  enrolledStudentIds: z.array(z.number()).optional(),
}).passthrough();

export async function GET() {
  try {
    const classes = await prisma.danceClass.findMany({
      include: {
        teachers: true,
        enrolledStudents: true,
      }
    });
    const response = classes.map(c => ({
      ...c,
      teacherIds: c.teachers.map(t => t.id),
      enrolledStudentIds: c.enrolledStudents.map(s => s.id),
    }))
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { teacherIds, enrolledStudentIds, styleId, levelId, ...classData } = classSchema.parse(data);

    const newClass = await prisma.danceClass.create({
      data: {
        ...classData,
        style: {
          connect: { id: styleId }
        },
        level: {
          connect: { id: levelId }
        },
        teachers: {
          connect: teacherIds.map((id: number) => ({ id })),
        },
        enrolledStudents: enrolledStudentIds ? {
          connect: enrolledStudentIds.map((id: number) => ({id}))
        } : undefined
      },
      include: {
        teachers: true,
        enrolledStudents: true,
      }
    });

    const response = {
      ...newClass,
      teacherIds: newClass.teachers.map(t => t.id),
      enrolledStudentIds: newClass.enrolledStudents.map(s => s.id)
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
