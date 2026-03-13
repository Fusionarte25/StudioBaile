
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const transactionUpdateSchema = z.object({
  type: z.enum(['ingreso', 'egreso']).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Prepare data
    const dataToUpdate: any = { ...body };
    if (body.date) {
        dataToUpdate.date = new Date(body.date).toISOString();
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('[TRANSACTION_PUT_ERROR]', error);
    return NextResponse.json({ error: 'Error al actualizar la transacción' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.transaction.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TRANSACTION_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Error al eliminar la transacción' }, { status: 500 });
  }
}
