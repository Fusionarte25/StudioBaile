
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Deleting all settings records...");
        await prisma.settings.deleteMany();
        console.log("All settings deleted. Generating the canonical 'singleton' record...");
        const created = await prisma.settings.create({
            data: {
                id: 'singleton',
                academyName: 'FusionArte',
                contactEmail: 'contacto@fusionarte.com',
                enableNewSignups: true,
                maintenanceMode: false,
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
        });
        console.log("Settings record with ID 'singleton' created successfully.");
    } catch (error) {
        console.error("Error during DB operation:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
