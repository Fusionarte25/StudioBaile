
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking if settings record exists...");
        const settings = await prisma.settings.findUnique({
            where: { id: 'singleton' }
        });

        if (settings) {
            console.log("Settings record exists:", settings);
        } else {
            console.log("Settings record does NOT exist. Creating...");
            const newSettings = await prisma.settings.create({
                data: {
                    id: 'singleton',
                    academyName: 'FusionArte',
                    contactEmail: 'contacto@fusionarte.com',
                    enableNewSignups: true,
                    maintenanceMode: false,
                    heroSlides: JSON.stringify([]),
                    scheduleImages: JSON.stringify([]),
                    aboutUsTitle: "Nuestra Historia",
                    aboutUsStory: "...",
                    aboutUsMission: "...",
                    aboutUsVision: "...",
                    aboutUsValues: "...",
                    aboutUsTeamTitle: "...",
                    aboutUsTeamDescription: "...",
                }
            });
            console.log("Successfully created settings record:", newSettings);
        }
    } catch (error) {
        console.error("Error during setup script:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
