export const dynamic = 'force-dynamic';


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
    const { classCount, totalPrice, selectedClassIds } = body; // Get optional values directly from body

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
      startDate: planDataFromDb.startDate ? new Date(planDataFromDb.startDate) : undefined,
      endDate: planDataFromDb.endDate ? new Date(planDataFromDb.endDate) : undefined,
      // Include new fields
      isUnlimitedCourses: planDataFromDb.isUnlimitedCourses ?? false,
      maxCourses: planDataFromDb.maxCourses ?? undefined,
      targetMonth: planDataFromDb.targetMonth ?? undefined,
      features: (() => {
        try { return JSON.parse(planDataFromDb.features || '[]'); } catch { return []; }
      })(),
      allowedClasses: (() => {
        try { return JSON.parse(planDataFromDb.allowedClasses || '[]'); } catch { return []; }
      })(),
    };

    const plan = membershipPlanZodSchema.parse(planToValidate);

    // --- FIN DEL BLINDAJE ---
    const currentYear = new Date().getFullYear();
    let regFee = plan.registrationFee || 0;

    // Check if user already paid registration for this year
    if (user.registrationPaidYear === currentYear) {
      regFee = 0;
    }

    // Use the fetched data from here on, not the client data.
    const basePrice = totalPrice ?? (plan.price ? plan.price : 0);
    const finalPrice = basePrice + regFee;
    const classesRemaining = classCount ?? (plan.accessType === 'class_pack' ? plan.classCount : undefined);

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (plan.validityType === 'fixed') {
      startDate = plan.startDate ? new Date(plan.startDate) : now;
      endDate = plan.endDate ? new Date(plan.endDate) : add(startDate, { months: 1 }); // Fallback to 1 month
    } else if (plan.validityType === 'monthly') {
      let startMonthDate = now;
      
      // If a targetMonth is specified, force that month
      if (plan.targetMonth) {
        const target = plan.targetMonth - 1; // 0-indexed
        startMonthDate = new Date(now.getFullYear(), target, 1);
        
        // If the target month has already passed this year, assume next year
        if (startMonthDate < startOfMonth(now)) {
          startMonthDate = addMonths(startMonthDate, 12);
        }
      } else if (plan.monthlyStartType === 'next_month') {
        startMonthDate = addMonths(now, 1);
      }

      startDate = startOfMonth(startMonthDate);
      endDate = subDays(addMonths(startDate, plan.validityMonths || 1), 1);
    } else { // relative
      startDate = now;
      const durationValue = plan.durationValue || 1;
      const durationUnit = plan.durationUnit || 'months' as any;
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
      // We only delete if it overlaps or if we want one active membership for now.
      // User requested "one active membership" logic in previous sessions.
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
          selectedClassIds: Array.isArray(selectedClassIds) ? JSON.stringify(selectedClassIds) : "[]",
        },
      });

      // 3. If registration fee was paid, update the user's record
      if (regFee > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { registrationPaidYear: currentYear }
        });
      }
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
