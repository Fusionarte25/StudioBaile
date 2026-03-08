
'use server';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { add, startOfMonth, endOfMonth, addMonths, subDays } from 'date-fns';
import { membershipPlanZodSchema } from '@/lib/types';

// This schema is now more lenient, only requiring the essentials to start the process.
const purchaseSchema = z.object({
  userId: z.number(),
  planId: z.string().min(1, { message: "El ID del plan es obligatorio." }),
}).passthrough(); // Use passthrough to allow other fields without validating them initially

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 1. Parse the lenient schema to get the IDs.
    const { userId, planId } = purchaseSchema.parse(body);
    const { classCount, totalPrice } = body; // Get optional values directly from body

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 2. BLINDANDO LA API: Re-fetch the plan from the database using the ID. This is the authoritative data source.
    const planDataFromDb = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!planDataFromDb) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }
    
    // 3. Validate the AUTHORITATIVE data with our strict schema.
    let parsedTiers = [];
    if (typeof planDataFromDb.priceTiers === 'string') {
        try {
          parsedTiers = JSON.parse(planDataFromDb.priceTiers);
        } catch (e) {
          console.error(`Failed to parse priceTiers for plan ${planDataFromDb.id}:`, e);
          parsedTiers = [];
        }
    } else if (Array.isArray(planDataFromDb.priceTiers)) {
        parsedTiers = planDataFromDb.priceTiers;
    }

    // Temporary validation object to satisfy the Zod schema which might have non-optional fields
    const planToValidate = {
        ...planDataFromDb,
        priceTiers: parsedTiers,
        price: planDataFromDb.price ?? undefined,
        classCount: planDataFromDb.classCount ?? undefined,
        durationValue: planDataFromDb.durationValue ?? undefined,
        validityMonths: planDataFromDb.validityMonths ?? undefined,
        startDate: planDataFromDb.startDate ?? undefined,
        endDate: planDataFromDb.endDate ?? undefined,
    };
    
    const plan = membershipPlanZodSchema.parse(planToValidate);

    // --- FIN DEL BLINDAJE ---

    // Use the fetched data from here on, not the client data.
    const finalPrice = totalPrice ?? (plan.price ? plan.price : 0);
    const classesRemaining = classCount ?? (plan.accessType === 'class_pack' ? plan.classCount : undefined);

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (plan.validityType === 'fixed') {
        startDate = plan.startDate ? new Date(plan.startDate) : now;
        endDate = plan.endDate ? new Date(plan.endDate) : add(startDate, { months: 1 }); // Fallback to 1 month
    } else if (plan.validityType === 'monthly') {
        const startMonth = plan.monthlyStartType === 'next_month' ? addMonths(now, 1) : now;
        startDate = plan.monthlyStartType === 'next_month' ? startOfMonth(startMonth) : now;
        endDate = subDays(addMonths(startDate, plan.validityMonths || 1), 1);
    } else { // relative
        startDate = now;
        const durationValue = plan.durationValue || 1;
        const durationUnit = plan.durationUnit || 'months';
        endDate = add(startDate, {
            [durationUnit]: durationValue
        });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create the invoice (StudentPayment)
      await tx.studentPayment.create({
        data: {
          studentId: userId,
          planId: planId,
          invoiceDate: now.toISOString(),
          totalAmount: finalPrice,
          status: 'pending',
          amountPaid: 0,
          amountDue: finalPrice,
          lastUpdatedBy: 'Sistema',
          lastUpdatedDate: new Date().toISOString(),
        },
      });

      // 2. Delete old membership and create the new one
      await tx.studentMembership.deleteMany({
        where: { userId: userId },
      });
      
      await tx.studentMembership.create({
        data: {
          userId: userId,
          planId: planId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          classesRemaining: classesRemaining,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Compra realizada con éxito' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Provide detailed validation errors for debugging
      const errorDetails = error.issues.map(issue => `${issue.path.join('.')} - ${issue.message}`).join(', ');
      console.error('Validation error:', error.issues);
      return NextResponse.json({ error: 'Datos de solicitud inválidos', details: errorDetails }, { status: 400 });
    }
    console.error('Purchase error:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar la compra', details: (error as Error).message }, { status: 500 });
  }
}
