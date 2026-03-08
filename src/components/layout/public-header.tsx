
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/icons/logo-icon';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-context';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';

const navLinks = [
  { href: '/about', label: 'Acerca de Nosotros' },
  { href: '/schedule', label: 'Clases / Horarios' },
  { href: '/memberships', label: 'Membresías' },
  { href: '/teachers', label: 'Profesores' },
  { href: '/contact', label: 'Contacto' },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { isAuthenticated } = useAuth();

  if (!settings) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
            {settings.logoUrl ? (
                <Image src={settings.logoUrl} alt={settings.academyName} width={40} height={40} className="h-8 w-auto" />
            ) : (
                <LogoIcon className="h-8 w-8 text-primary" />
            )}
          <span className="font-bold text-lg font-headline">{settings.academyName}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn('text-sm font-medium transition-colors hover:text-primary', 
                pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        
        {!isAuthenticated && (
          <div className="hidden md:flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Acceder</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Registrarse</Link>
            </Button>
          </div>
        )}
        
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
                <SheetHeader>
                    <SheetTitle className="text-left">Navegación Principal</SheetTitle>
                </SheetHeader>
              <nav className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link href={link.href} className="text-lg font-medium hover:text-primary">
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                {!isAuthenticated && (
                  <>
                    <SheetClose asChild>
                        <Button asChild className="mt-4">
                          <Link href="/login">Acceder</Link>
                        </Button>
                    </SheetClose>
                    <SheetClose asChild>
                        <Button asChild variant="outline">
                          <Link href="/register">Registrar</Link>
                        </Button>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
