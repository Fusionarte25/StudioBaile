import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // A lightweight query to keep the database connection pool warm
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json(
            { status: 'ok', timestamp: new Date().toISOString() },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store'
                }
            }
        );
    } catch (error) {
        console.error('Ping failed:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
