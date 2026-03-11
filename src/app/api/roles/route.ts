export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  permissions: z.array(z.string()),
});

export async function GET() {
  try {
    const roles = await prisma.role.findMany();
    const parsedRoles = roles.map((role: any) => ({
      ...role,
      permissions: (() => {
        try { return JSON.parse(role.permissions || '[]'); } catch { return []; }
      })()
    }));
    return NextResponse.json(parsedRoles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const validatedData = roleSchema.parse(data);

    // Check if exists
    const existingRole = await prisma.role.findUnique({ where: { id: validatedData.id } });
    if (existingRole) {
      return NextResponse.json({ error: 'Role ID already exists' }, { status: 409 });
    }

    const newRole = await prisma.role.create({
      data: {
        id: validatedData.id,
        name: validatedData.name,
        permissions: JSON.stringify(validatedData.permissions),
      }
    });

    return NextResponse.json({
      ...newRole,
      permissions: JSON.parse(newRole.permissions)
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
