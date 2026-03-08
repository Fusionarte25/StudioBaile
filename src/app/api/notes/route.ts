
'use server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const tasks = await prisma.taskNote.findMany({
      include: {
        assignees: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const taskNoteCreateSchema = z.object({
  title: z.string().min(1, "El título es obligatorio."),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  category: z.string().min(1, "La categoría es obligatoria."),
  assigneeIds: z.array(z.number()).default([]),
  dueDate: z.string().datetime().optional().nullable(),
  alertDateTime: z.string().optional().nullable(),
});

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const data = taskNoteCreateSchema.parse(json);

        const newTask = await prisma.taskNote.create({
            data: {
                title: data.title,
                description: data.description,
                status: data.status,
                priority: data.priority,
                category: data.category,
                dueDate: data.dueDate,
                alertDateTime: data.alertDateTime,
                assignees: {
                    connect: data.assigneeIds.map((id: number) => ({ id })),
                },
            },
        });
        return NextResponse.json(newTask, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
        }
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
