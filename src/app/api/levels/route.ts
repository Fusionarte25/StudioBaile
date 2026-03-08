import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const levelSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    description: z.string().min(1, "La descripción es obligatoria."),
});

export async function GET() {
  try {
    const levels = await prisma.danceLevel.findMany();
    return NextResponse.json(levels);
  } catch (error) {
    console.error('Error fetching levels:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const validatedData = levelSchema.parse(data);
        const newLevel = await prisma.danceLevel.create({
            data: validatedData,
        });
        return NextResponse.json(newLevel, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error('Error creating level:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
