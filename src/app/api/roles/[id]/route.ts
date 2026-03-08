import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const roleSchema = z.object({
    name: z.string().optional(),
    permissions: z.array(z.string()).optional(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const roleId = params.id;
        const json = await request.json();
        const validatedData = roleSchema.parse(json);

        const dataToUpdate: any = {};
        if (validatedData.name) {
            dataToUpdate.name = validatedData.name;
        }
        if (validatedData.permissions) {
            dataToUpdate.permissions = JSON.stringify(validatedData.permissions);
        }

        const updatedRole = await prisma.role.update({
            where: { id: roleId },
            data: dataToUpdate,
        });

        return NextResponse.json({
            ...updatedRole,
            permissions: JSON.parse(updatedRole.permissions)
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const roleId = params.id;

        // Safety check - do not delete core roles
        if (['admin', 'teacher', 'student', 'socio', 'administrative'].includes(roleId.toLowerCase())) {
            return NextResponse.json({ error: 'Cannot delete core roles' }, { status: 403 });
        }

        await prisma.role.delete({
            where: { id: roleId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
