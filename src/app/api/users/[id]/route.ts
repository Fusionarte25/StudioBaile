
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { paymentDetailsJsonSchema } from '@/lib/types';


const userUpdateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  mobile: z.string().optional().nullable(),
  dob: z.string().optional().nullable(),
  role: z.string().optional(),

  membershipPlanId: z.string().optional().nullable(),
  membershipStartDate: z.date().optional().nullable(),
  membershipEndDate: z.date().optional().nullable(),
  membershipClassesRemaining: z.number().optional().nullable(),

  bio: z.string().optional().nullable(),
  specialties: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  isVisibleToStudents: z.boolean().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional().or(z.literal('')),
  paymentDetailsJson: paymentDetailsJsonSchema.nullable().optional(),
}).partial();


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        taughtClasses: true,
        enrolledClasses: true,
        memberships: true,
        payments: true,
        assignedTasks: true,
        attendanceHistory: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const { password, specialties, paymentDetailsJson, ...userWithoutPassword } = user;
    const parsedUser = {
      ...userWithoutPassword,
      specialties: (() => {
        try { return JSON.parse(specialties || '[]'); } catch { return []; }
      })(),
      paymentDetailsJson: (() => {
        if (!paymentDetailsJson) return null;
        try { return JSON.parse(paymentDetailsJson); } catch { return null; }
      })()
    };
    return NextResponse.json(parsedUser);
  } catch (error) {
    console.error(`Error fetching user ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const json = await request.json();
    if (json.membershipStartDate) json.membershipStartDate = new Date(json.membershipStartDate);
    if (json.membershipEndDate) json.membershipEndDate = new Date(json.membershipEndDate);
    const validatedData = userUpdateSchema.parse(json);

    const dataToUpdate: any = {};

    if (validatedData.name) dataToUpdate.name = validatedData.name;
    if (validatedData.email) dataToUpdate.email = validatedData.email;
    if (validatedData.mobile !== undefined) dataToUpdate.mobile = validatedData.mobile;
    if (validatedData.dob !== undefined) dataToUpdate.dob = validatedData.dob;
    if (validatedData.bio !== undefined) dataToUpdate.bio = validatedData.bio;
    if (validatedData.specialties !== undefined) {
      dataToUpdate.specialties = JSON.stringify(validatedData.specialties?.split(',').map(s => s.trim()) || []);
    }
    if (validatedData.avatar !== undefined) dataToUpdate.avatar = validatedData.avatar;
    if (validatedData.isVisibleToStudents !== undefined) dataToUpdate.isVisibleToStudents = validatedData.isVisibleToStudents;

    if (validatedData.role) {
      dataToUpdate.role = validatedData.role;
      dataToUpdate.isPartner = validatedData.role === 'Socio';
    }

    if (validatedData.password && validatedData.password.length > 0) {
      dataToUpdate.password = await bcrypt.hash(validatedData.password, 10);
    }

    if (validatedData.hasOwnProperty('paymentDetailsJson')) {
      dataToUpdate.paymentDetailsJson = JSON.stringify(validatedData.paymentDetailsJson);
    }


    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });

      const planId = validatedData.membershipPlanId;
      const startDate = validatedData.membershipStartDate;
      const endDate = validatedData.membershipEndDate;

      if (planId !== undefined && startDate !== undefined && endDate !== undefined) {
        await tx.studentMembership.deleteMany({
          where: { userId: userId },
        });

        if (planId && planId !== 'none' && startDate && endDate) {
          await tx.studentMembership.create({
            data: {
              userId: userId,
              planId: planId,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              classesRemaining: validatedData.membershipClassesRemaining,
            }
          });
        }
      }

      return user;
    });

    const { password, specialties, paymentDetailsJson, ...userWithoutPassword } = updatedUser;
    const parsedUser = {
      ...userWithoutPassword,
      specialties: (() => {
        try { return JSON.parse(specialties || '[]'); } catch { return []; }
      })(),
      paymentDetailsJson: (() => {
        if (!paymentDetailsJson) return null;
        try { return JSON.parse(paymentDetailsJson); } catch { return null; }
      })()
    };
    return NextResponse.json(parsedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation Error:', error.errors);
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error(`Error updating user ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {

      await tx.studentMembership.deleteMany({ where: { userId } });
      await tx.studentPayment.deleteMany({ where: { studentId: userId } });

      await tx.user.delete({
        where: { id: userId },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting user ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
