export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const couponSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  expirationDate: z.string().optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  status: z.enum(['active', 'inactive']),
  applicableTo: z.enum(['all_memberships', 'specific_memberships', 'all_classes', 'specific_classes']),
  specificPlanIds: z.array(z.string()).optional(),
  specificClassIds: z.array(z.string()).optional(),
});


export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany();
    const parsedCoupons = coupons.map(coupon => ({
      ...coupon,
      specificPlanIds: (() => { try { return JSON.parse(coupon.specificPlanIds || '[]'); } catch { return []; } })(),
      specificClassIds: (() => { try { return JSON.parse(coupon.specificClassIds || '[]'); } catch { return []; } })(),
    }));
    return NextResponse.json(parsedCoupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const validatedData = couponSchema.parse(data);

    const couponData = {
      ...validatedData,
      expirationDate: validatedData.expirationDate ? new Date(validatedData.expirationDate) : null,
      usageLimit: validatedData.usageLimit,
      specificPlanIds: JSON.stringify(validatedData.specificPlanIds || []),
      specificClassIds: JSON.stringify(validatedData.specificClassIds || []),
    };

    const newCoupon = await prisma.coupon.create({
      data: couponData as any,
    });

    const returnCoupon = {
      ...newCoupon,
      specificPlanIds: (() => { try { return JSON.parse(newCoupon.specificPlanIds || '[]'); } catch { return []; } })(),
      specificClassIds: (() => { try { return JSON.parse(newCoupon.specificClassIds || '[]'); } catch { return []; } })(),
    };

    return NextResponse.json(returnCoupon, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating coupon:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
