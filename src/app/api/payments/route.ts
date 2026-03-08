
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const payments = await prisma.studentPayment.findMany();
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching student payments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
