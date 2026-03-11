export const dynamic = 'force-dynamic';

'use server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { paymentDetailsJsonSchema } from '@/lib/types';



const userCreateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional().or(z.literal('')),
  role: z.string(),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  paymentDetailsJson: paymentDetailsJsonSchema.optional().nullable(),
  avatar: z.string().optional(),
  isVisibleToStudents: z.boolean().default(false).optional(),
});


export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
      }
    });
    const parsedUsers = users.map(({ password, specialties, paymentDetailsJson, ...user }) => {
      return {
        ...user,
        specialties: (() => {
          try { return JSON.parse(specialties || '[]'); } catch { return []; }
        })(),
        paymentDetailsJson: (() => {
          if (!paymentDetailsJson) return null;
          try { return JSON.parse(paymentDetailsJson); } catch { return null; }
        })()
      };
    });
    return NextResponse.json(parsedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const validatedData = userCreateSchema.parse(data);

    const existingUser = await prisma.user.findUnique({ where: { email: validatedData.email } });
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está en uso.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password || 'password123', 10);

    const initials = validatedData.name.split(' ').map(n => n[0]).join('');
    const avatarUrl = validatedData.avatar || `https://placehold.co/100x100.png?text=${initials}`;

    const dataToCreate: any = {
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: validatedData.role,
      avatar: avatarUrl,
      bio: validatedData.bio,
      specialties: JSON.stringify(validatedData.specialties?.split(',').map(s => s.trim()) || []),
      isVisibleToStudents: validatedData.isVisibleToStudents,
      isPartner: validatedData.role === 'Socio',
    };

    if (validatedData.paymentDetailsJson) {
      dataToCreate.paymentDetailsJson = JSON.stringify(validatedData.paymentDetailsJson);
    }

    const newUser = await prisma.user.create({
      data: dataToCreate
    });

    const { password, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
