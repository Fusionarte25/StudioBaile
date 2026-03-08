import { NextResponse, type NextRequest } from 'next/server';
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const danceClass = await prisma.danceClass.findUnique({
      where: { id: params.id },
      include: {
        teachers: true,
        enrolledStudents: true,
      },
    });
    if (!danceClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    const response = {
      ...danceClass,
      teacherIds: danceClass.teachers.map(t => t.id),
      enrolledStudentIds: danceClass.enrolledStudents.map(s => s.id)
    }
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error fetching class ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { teacherIds, enrolledStudentIds, styleId, levelId, ...classData } = classSchema.parse(data);

    const updatedClass = await prisma.danceClass.update({
      where: { id: params.id },
      data: {
        ...classData,
        teachers: teacherIds ? {
          set: teacherIds.map((id: number) => ({ id })),
        } : undefined,
        enrolledStudents: enrolledStudentIds ? {
          set: enrolledStudentIds.map((id: number) => ({ id })),
        } : undefined,
        ...(styleId && { style: { connect: { id: styleId } } }),
        ...(levelId && { level: { connect: { id: levelId } } }),
      },
      include: {
        teachers: true,
        enrolledStudents: true,
      }
    });

    const response = {
      ...updatedClass,
      teacherIds: updatedClass.teachers.map(t => t.id),
      enrolledStudentIds: updatedClass.enrolledStudents.map(s => s.id)
    }
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error updating class ${params.id}:`, error);
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.danceClass.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting class ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
