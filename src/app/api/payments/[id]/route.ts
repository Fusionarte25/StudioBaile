
'use server';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paymentUpdateSchema = z.object({
  status: z.enum(['paid', 'pending', 'deposit']),
  amountPaid: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const json = await request.json();
    const validatedData = paymentUpdateSchema.parse(json);
    
    const paymentToUpdate = await prisma.studentPayment.findUnique({
        where: { id: params.id }
    });

    if (!paymentToUpdate) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (validatedData.amountPaid > paymentToUpdate.totalAmount) {
        return NextResponse.json({ error: 'Amount paid cannot be greater than total amount' }, { status: 400 });
    }

    const updatedPayment = await prisma.studentPayment.update({
      where: { id: params.id },
      data: {
          ...validatedData,
          amountDue: paymentToUpdate.totalAmount - validatedData.amountPaid,
          lastUpdatedDate: new Date().toISOString(),
          // lastUpdatedBy: 'Admin', // In a real app, get this from the session
      },
    });
    return NextResponse.json(updatedPayment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
