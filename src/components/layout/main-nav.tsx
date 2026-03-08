
'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth, UserRole } from '@/context/auth-context';
import { LogoIcon } from '@/components/icons/logo-icon';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Settings, BookMarked, User, LogOut, CreditCard, Calendar, Users, ClipboardList, Banknote, GraduationCap, HandCoins, LayoutDashboard, Ticket, Palette, Signal, StickyNote } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useSettings } from '@/context/settings-context';
import Image from 'next/image';

const publicNav = [
    { href: '/', label: 'Inicio' },
    { href: '/about', label: 'Acerca de Nosotros' },
    { href: '/schedule', label: 'Clases / Horarios' },
    { href: '/memberships', label: 'Membresías' },
    { href: '/teachers', label: 'Profesores' },
    { href: '/contact', label: 'Contacto' },
];

export const userProfiles: Record<UserRole, { id: number; name: string; role: string; avatar: string }> = {
    Estudiante: { id: 1, name: 'Ana López', role: 'Estudiante', avatar: 'https://placehold.co/100x100.png?text=AL' },
    Profesor: { id: 10, name: 'Alexandra', role: 'Profesor/a', avatar: 'https://placehold.co/100x100.png?text=A' },
    Admin: { id: 4, name: 'Admin FusionArte', role: 'Administrador/a', avatar: 'https://placehold.co/100x100.png?text=AF' },
    Administrativo: { id: 7, name: 'Laura Martinez', role: 'Recepción', avatar: 'https://placehold.co/100x100.png?text=LM' },
    Socio: { id: 2, name: 'Oscar Girao', role: 'Socio', avatar: 'https://placehold.co/100x100.png?text=OG' },
};

function UserMenu() {
    const { logout, currentUser, isAuthenticated, userRole } = useAuth();
    const router = useRouter();

    if (!isAuthenticated || !currentUser) {
        return (
            <div className="hidden lg:flex items-center gap-3">
                <Button asChild size="sm" variant="ghost" className="hidden xl:flex text-foreground hover:text-gold hover:bg-gold/10 transition-colors">
                    <Link href="/login">Acceder</Link>
                </Button>
                <Button asChild size="sm" className="bg-gradient-to-r from-gold to-[#b8860b] text-white hover:opacity-90 transition-opacity border-none shadow-md">
                    <Link href="/register">Registrarse</Link>
                </Button>
            </div>
        );
    }

    const managementRoles = ['Admin', 'Socio', 'Administrativo'];
    const teacherAreaRoles = ['Profesor', 'Socio'];

    const canManage = userRole && managementRoles.includes(userRole);
    const canAccessTeacherArea = userRole && teacherAreaRoles.includes(userRole);
    const canManageNotes = userRole === 'Admin' || userRole === 'Socio';
    const canManageSettings = userRole === 'Admin' || userRole === 'Socio';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                        <AvatarFallback>{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                    <p className="font-bold">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground font-normal">{currentUser.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push('/profile')}><User className="mr-2 h-4 w-4" /> Mi Perfil</DropdownMenuItem>
                    {canAccessTeacherArea && (
                        <>
                            <DropdownMenuItem onClick={() => router.push('/my-classes')}><ClipboardList className="mr-2 h-4 w-4" />Mis Clases</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/my-finances')}><HandCoins className="mr-2 h-4 w-4" />Mis Finanzas</DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuGroup>
                {canManage && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                            </DropdownMenuItem>
                            {canManageNotes && (
                                <DropdownMenuItem onClick={() => router.push('/admin/notes')}>
                                    <StickyNote className="mr-2 h-4 w-4" />
                                    <span>Notas y Tareas</span>
                                </DropdownMenuItem>
                            )}
                            {canManageSettings && (
                                <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Configuración</span>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuGroup>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function NavLinks() {
    const pathname = usePathname();
    return (
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {publicNav.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn('text-sm font-medium transition-colors hover:text-primary',
                        pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)) ? 'text-primary' : 'text-muted-foreground'
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}

function MobileNav() {
    const { isAuthenticated } = useAuth();

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="xl:hidden">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="right">
                <SheetHeader>
                    <SheetTitle>Menú</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-8">
                    {publicNav.map((link) => (
                        <SheetClose asChild key={link.href}>
                            <Link href={link.href} className="text-lg font-medium hover:text-primary flex items-center gap-2">
                                {link.label}
                            </Link>
                        </SheetClose>
                    ))}
                </nav>
                {!isAuthenticated && (
                    <div className="mt-8 flex flex-col gap-2">
                        <SheetClose asChild>
                            <Button asChild><Link href="/login">Acceder</Link></Button>
                        </SheetClose>
                        <SheetClose asChild>
                            <Button asChild variant="outline"><Link href="/register">Registrarse</Link></Button>
                        </SheetClose>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

export function MainNav() {
    const { settings } = useSettings();
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-2xl border-b border-gold/20 shadow-[0_4px_30px_rgba(212,175,55,0.1)] supports-[backdrop-filter]:bg-white/60 no-print transition-all duration-300">
            <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6">

                {/* Brand */}
                <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 group shrink-0">
                    <div className="relative w-12 h-12 flex items-center justify-center bg-gradient-to-br from-gold/20 to-gold/5 rounded-2xl border border-gold/30 group-hover:border-gold/60 transition-colors shadow-inner overflow-hidden">
                        {settings?.logoUrl ? (
                            <Image src={settings.logoUrl} alt={settings.academyName} width={36} height={36} className="h-9 w-auto object-contain" />
                        ) : (
                            <LogoIcon className="h-7 w-7 text-gold drop-shadow-md" />
                        )}
                    </div>
                    <div className="flex flex-col hidden sm:flex">
                        <span className="font-serif font-bold text-xl tracking-tight text-foreground leading-none">{settings?.academyName || 'FusionArte'}</span>
                        <span className="text-[9px] uppercase tracking-[0.25em] text-gold font-bold mt-1">Academy of Dance</span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden xl:flex items-center flex-1 justify-center px-2 lg:px-4">
                    <nav className="flex items-center gap-1 lg:gap-2">
                        {publicNav.map((link) => {
                            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn('px-3 py-2 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 whitespace-nowrap',
                                        isActive ? 'text-white bg-gradient-to-r from-[#d4af37] to-[#b8860b] shadow-[0_4px_14px_rgba(212,175,55,0.4)]' : 'text-foreground hover:text-[#d4af37] hover:bg-[#d4af37]/10'
                                    )}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 shrink-0 justify-end">
                    <div className="hidden xl:block h-8 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent mx-2" />
                    <UserMenu />
                    <div className="xl:hidden ml-2 block">
                        <MobileNav />
                    </div>
                </div>
            </div>
        </header>
    );
}
