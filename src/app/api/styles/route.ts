import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const styleSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  description: z.string().min(1, "La descripción es obligatoria."),
});

export async function GET() {
  try {
    const styles = await prisma.danceStyle.findMany();
    return NextResponse.json(styles);
  } catch (error) {
    console.error('Error fetching styles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const validatedData = styleSchema.parse(data);
        const newStyle = await prisma.danceStyle.create({
            data: validatedData,
        });
        return NextResponse.json(newStyle, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error('Error creating style:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
