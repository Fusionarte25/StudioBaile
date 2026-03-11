export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';


const heroSlideSchema = z.object({
  id: z.string().optional(),
  heroTitle: z.string().min(1, "El título es obligatorio."),
  heroSubtitle: z.string().optional(),
  heroDescription: z.string().optional(),
  heroButtonText: z.string().min(1, "El texto del botón es obligatorio."),
  heroButtonLink: z.string().url("Debe ser una URL válida.").or(z.literal('')),
  heroImageUrl: z.string().optional(),
});

const scheduleImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, "La URL de la imagen no puede estar vacía."),
  alt: z.string().optional(),
});

const settingsSchema = z.object({
  academyName: z.string().min(1, "El nombre de la academia es obligatorio.").optional(),
  contactEmail: z.string().email("Introduce un email válido.").optional(),
  phone: z.string().optional(),
  whatsappPhone: z.string().optional(),
  address: z.string().optional(),
  welcomeMessage: z.string().optional(),
  enableNewSignups: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  instagramUrl: z.string().url("URL de Instagram inválida.").or(z.literal('')).optional(),
  facebookUrl: z.string().url("URL de Facebook inválida.").or(z.literal('')).optional(),
  tiktokUrl: z.string().url("URL de TikTok inválida.").or(z.literal('')).optional(),
  openingHours: z.string().optional(),

  registrationEmailMessage: z.string().optional(),
  membershipEmailMessage: z.string().optional(),

  aboutUsTitle: z.string().min(1, "El título es obligatorio.").optional(),
  aboutUsStory: z.string().min(1, "La historia es obligatoria.").optional(),
  aboutUsMission: z.string().min(1, "La misión es obligatoria.").optional(),
  aboutUsVision: z.string().min(1, "La visión es obligatoria.").optional(),
  aboutUsValues: z.string().min(1, "Los valores son obligatorios.").optional(),
  aboutUsTeamTitle: z.string().min(1, "El título del equipo es obligatorio.").optional(),
  aboutUsTeamDescription: z.string().min(1, "La descripción del equipo es obligatoria.").optional(),

  heroSlides: z.union([z.string(), z.array(heroSlideSchema)]).optional(),
  scheduleImages: z.union([z.string(), z.array(scheduleImageSchema)]).optional(),
}).passthrough();


const SETTINGS_ID = 'singleton';

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: SETTINGS_ID,
          academyName: 'FusionArte',
          contactEmail: 'contacto@fusionarte.com',
          phone: "+34 123 456 789",
          whatsappPhone: "+34123456789",
          address: "Calle Falsa 123, Ciudad Danza, 45678",
          enableNewSignups: true,
          maintenanceMode: false,
          instagramUrl: "https://www.instagram.com/fusionarte",
          facebookUrl: "https://www.facebook.com/fusionarte",
          tiktokUrl: "https://www.tiktok.com/@fusionarte",
          aboutUsTitle: "Nuestra Historia",
          aboutUsStory: "FusionArte nació de un sueño compartido...",
          aboutUsMission: "Ofrecer una enseñanza de la más alta calidad...",
          aboutUsVision: "Ser un referente en la enseñanza de la danza...",
          aboutUsValues: "Pasión, Respeto, Comunidad...",
          aboutUsTeamTitle: "El Equipo Fundador",
          aboutUsTeamDescription: "Las mentes y corazones detrás de FusionArte.",
          heroSlides: JSON.stringify([]),
          scheduleImages: JSON.stringify([]),
        }
      })
    }

    // Parse JSON strings back to arrays if they are strings
    const responseData = {
      ...settings,
      heroSlides: typeof settings.heroSlides === 'string' ? JSON.parse(settings.heroSlides) : settings.heroSlides,
      scheduleImages: typeof settings.scheduleImages === 'string' ? JSON.parse(settings.scheduleImages) : settings.scheduleImages,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const partialData = await request.json();
    console.log('Received settings update:', partialData);

    const validatedPartialData = settingsSchema.parse(partialData);

    // Remove ID if present to avoid updating primary key
    const { id, ...dataToProcess } = validatedPartialData as any;

    const dataToUpdate: any = {};

    for (const key in dataToProcess) {
      if (Object.prototype.hasOwnProperty.call(dataToProcess, key)) {
        let value = dataToProcess[key];
        if (value !== undefined) {
          // If the field should be a string in DB but we got an array, stringify it
          if ((key === 'heroSlides' || key === 'scheduleImages') && Array.isArray(value)) {
            value = JSON.stringify(value);
          }
          dataToUpdate[key] = value;
        }
      }
    }

    console.log('Updating settings in DB with:', dataToUpdate);

    const updatedSettings = await prisma.settings.update({
      where: { id: SETTINGS_ID },
      data: dataToUpdate,
    });

    // Return parsed JSON for the frontend
    const responseData = {
      ...updatedSettings,
      heroSlides: typeof updatedSettings.heroSlides === 'string' ? JSON.parse(updatedSettings.heroSlides) : updatedSettings.heroSlides,
      scheduleImages: typeof updatedSettings.scheduleImages === 'string' ? JSON.parse(updatedSettings.scheduleImages) : updatedSettings.scheduleImages,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error updating settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
