import { prisma } from './prisma';
import { UserRole } from '@/context/auth-context';

export async function getServerSession(request: Request) {
    // In a real app, this would check cookies or a JWT token
    // For this demonstration, we'll try to extract the user from a header or just a mock
    // if you want it functional but basic.

    // As the project currently uses localStorage for login, the server has NO WAY to know who is logged in
    // unless we send a custom header or use cookies.

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    try {
        const userId = parseInt(authHeader.replace('Bearer ', ''));
        if (isNaN(userId)) return null;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        return user;
    } catch (e) {
        return null;
    }
}

export async function isAdmin(request: Request) {
    const user = await getServerSession(request);
    return user?.role === 'Admin' || user?.role === 'Socio';
}
