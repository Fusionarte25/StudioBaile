
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log(`Start seeding ...`)

    // Clean up database
    await prisma.studentPayment.deleteMany();
    await prisma.studentMembership.deleteMany();
    await prisma.danceClass.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.danceStyle.deleteMany();
    await prisma.danceLevel.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.taskNote.deleteMany();
    console.log('Database cleaned.');

    // Seed Roles
    const rolesData = [
        { id: 'admin', name: 'Admin', permissions: ['view_dashboard', 'manage_users', 'manage_students', 'manage_classes', 'manage_memberships', 'manage_finances', 'manage_settings', 'manage_roles', 'take_attendance'] },
        { id: 'socio', name: 'Socio', permissions: ['view_dashboard', 'manage_users', 'manage_students', 'manage_classes', 'manage_memberships', 'manage_finances', 'manage_settings', 'view_teacher_area', 'take_attendance'] },
        { id: 'profesor', name: 'Profesor', permissions: ['view_teacher_area', 'take_attendance'] },
        { id: 'administrativo', name: 'Administrativo', permissions: ['view_dashboard', 'manage_students', 'manage_classes'] },
        { id: 'estudiante', name: 'Estudiante', permissions: [] },
    ];
    for (const role of rolesData) {
        await prisma.role.upsert({
            where: { id: role.id },
            update: {},
            create: {
                ...role,
                permissions: JSON.stringify(role.permissions)
            },
        });
    }
    console.log('Roles seeded.');

    // Seed Dance Levels
    const levelsData = [
        { id: 'inicio', name: 'Inicio', description: 'Para alumnos que nunca han bailado antes y quieren aprender los fundamentos desde cero.' },
        { id: 'principiante', name: 'Básico / Principiante', description: 'Para alumnos con algo de experiencia o que han completado el nivel de inicio.' },
        { id: 'intermedio', name: 'Intermedio', description: 'Para alumnos que dominan los pasos básicos y quieren aprender combinaciones más complejas.' },
        { id: 'avanzado', name: 'Avanzado', description: 'Para alumnos con amplia experiencia, enfocados en técnica, musicalidad y figuras complejas.' },
        { id: 'todos', name: 'Todos los niveles', description: 'Clase abierta a todos los alumnos, sin importar su experiencia previa. Ideal para practicar.' },
    ];
    for (const level of levelsData) {
        await prisma.danceLevel.create({ data: level });
    }
    console.log('Dance levels seeded.');

    // Seed Dance Styles
    const stylesData = [
        { id: 'salsa', name: 'Salsa', description: 'Ritmos latinos vibrantes con raíces cubanas y puertorriqueñas.' },
        { id: 'bachata', name: 'Bachata', description: 'Baile sensual y romántico originario de la República Dominicana.' },
        { id: 'zouk', name: 'Zouk', description: 'Baile brasileño moderno y fluido, conocido por sus movimientos de cabeza y cuerpo.' },
        { id: 'aeroyoga', name: 'Aeroyoga', description: 'Fusión de yoga, pilates y acrobacias en una hamaca suspendida.' },
        { id: 'elongacion', name: 'Elongación', description: 'Clases enfocadas en mejorar la flexibilidad, el rango de movimiento y la postura corporal.' },
        { id: 'gimnasia-ritmica', name: 'Gimnasia Rítmica', description: 'Disciplina que combina elementos de ballet, gimnasia, danza y el uso de aparatos.' },
        { id: 'urbano', name: 'Urbano', description: 'Engloba estilos de baile callejero como Hip Hop, Popping, Locking y Breaking.' },
        { id: 'practica', name: 'Práctica Libre', description: 'Espacio para práctica libre o alquiler de sala.' },
    ];
    for (const style of stylesData) {
        await prisma.danceStyle.create({ data: style });
    }
    console.log('Dance styles seeded.');


    // Create one user for each role
    const hashedPassword = await bcrypt.hash('password123', 10);

    const usersToCreate = [
        { name: 'Admin User', email: 'admin@fusionarte.com', roleName: 'Admin' },
        { name: 'Socio User', email: 'socio@fusionarte.com', roleName: 'Socio' },
        { name: 'Profesor User', email: 'profesor@fusionarte.com', roleName: 'Profesor' },
        { name: 'Administrativo User', email: 'administrativo@fusionarte.com', roleName: 'Administrativo' },
        { name: 'Estudiante User', email: 'estudiante@fusionarte.com', roleName: 'Estudiante' },
    ];

    for (const userData of usersToCreate) {
        const initials = userData.name.split(' ').map(n => n[0]).join('');
        await prisma.user.create({
            data: {
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                role: userData.roleName,
                joined: new Date(),
                avatar: `https://placehold.co/100x100.png?text=${initials}`
            },
        });
        console.log(`Created user: ${userData.name}`);
    }

    console.log(`Seeding finished.`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
