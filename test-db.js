const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(() => console.log('success')).catch(console.error).finally(() => prisma.$disconnect());
