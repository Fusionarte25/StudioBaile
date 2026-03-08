
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const memberships = await prisma.studentMembership.findMany();
    return NextResponse.json(memberships);
  } catch (error) {
    console.error('Error fetching student memberships:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
