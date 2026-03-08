
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Listing all Settings records...");
        const settings = await prisma.settings.findMany();
        console.log("Found", settings.length, "settings records.");
        settings.forEach(s => {
            console.log("ID:", JSON.stringify(s.id), "Academy Name:", s.academyName);
        });

        if (settings.length === 0) {
            console.log("No settings found. Generating one...");
            const created = await prisma.settings.create({
                data: {
                    id: 'singleton',
                    academyName: 'FusionArte',
                    contactEmail: 'contacto@fusionarte.com',
                    enableNewSignups: true,
                    maintenanceMode: false,
                    aboutUsTitle: "Nuestra Historia",
                    aboutUsStory: "...",
                    aboutUsMission: "...",
                    aboutUsVision: "...",
                    aboutUsValues: "...",
                    aboutUsTeamTitle: "...",
                    aboutUsTeamDescription: "...",
                    heroSlides: JSON.stringify([]),
                    scheduleImages: JSON.stringify([]),
                }
            });
            console.log("Created Settings:", created.id);
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
