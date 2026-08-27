export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPaymentSchema = z.object({
  studentId: z.number(),
  planId: z.string(),
  invoiceDate: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  amountPaid: z.number(),
  amountDue: z.number(),
  lastUpdatedBy: z.string(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const payments = await prisma.studentPayment.findMany();
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching student payments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const validatedData = createPaymentSchema.parse(data);
    
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.studentPayment.create({
        data: {
          ...validatedData,
          lastUpdatedDate: new Date().toISOString(),
        }
      });
      return payment;
    });

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error) {
    console.error('Error creating student payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
