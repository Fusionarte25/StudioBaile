import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Solo promover a admin la cuenta fusionarte.mallorca@gmail.com
        const user = await prisma.user.update({
            where: { email: 'fusionarte.mallorca@gmail.com' },
            data: { role: 'Administrador' },
        });

        // Crear la configuración inicial de la web
        await prisma.settings.upsert({
            where: { id: 'singleton' },
            update: {},
            create: {
                id: 'singleton',
                academyName: 'FusionArte Studio',
                welcomeMessage: 'Bienvenido a FusionArte Studio',
                logoUrl: '',
                faviconUrl: '',
                primaryColor: '#B8860B',
                secondaryColor: '#FFFFFF',
                heroSlides: JSON.stringify([{
                    id: '1',
                    heroTitle: 'Bienvenido a FusionArte',
                    heroSubtitle: 'Escuela de Baile',
                    heroDescription: 'Descubre el arte del baile con nosotros',
                    heroButtonText: 'Comenzar',
                    heroButtonLink: '/login',
                    heroImageUrl: 'https://placehold.co/800x1200.png',
                }]),
                aboutUsContent: 'Somos una escuela de baile.',
                contactEmail: 'fusionarte.mallorca@gmail.com',
                contactPhone: '',
                address: 'Mallorca, España',
                socialLinks: JSON.stringify({}),
                businessHours: JSON.stringify({}),
            },
        });

        return NextResponse.json({ success: true, message: 'Tu cuenta ahora es Administrador.' });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
