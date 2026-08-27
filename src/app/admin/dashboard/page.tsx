
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, GraduationCap, Users, Banknote, CreditCard, Settings, Palette, Signal, StickyNote, Activity, TrendingUp, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
    const { currentUser, userRole } = useAuth();
    const [stats, setStats] = useState({ students: 0, classesToday: 0, revenue: 0 });
    const [isLoading, setIsLoading] = useState(true);
    
    const canViewFinances = userRole === 'Admin' || userRole === 'Socio';
    const canViewSettings = userRole === 'Admin' || userRole === 'Socio' || userRole === 'Administrativo';
    const canViewNotes = userRole === 'Admin' || userRole === 'Socio';

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetching lightweight metrics or using existing consolidated base
                const response = await fetch('/api/admin/consolidated-data');
                if (response.ok) {
                    const data = await response.json();
                    
                    const studentsCount = data.users?.filter((u: any) => u.role === 'Estudiante').length || 0;
                    
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayDayStr = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
                    // Capitalize first letter of todayDayStr to match database day format
                    const todayDayStrCap = todayDayStr.charAt(0).toUpperCase() + todayDayStr.slice(1);
                    
                    const classesToday = data.danceClasses?.filter((c: any) => {
                        if (c.type === 'recurring' && c.day === todayDayStrCap) return true;
                        if (c.date && c.date.startsWith(todayStr)) return true;
                        return false;
                    }).length || 0;

                    const activeMonthlyRevenue = data.studentPayments?.reduce((acc: number, pay: any) => {
                        return acc + (pay.status === 'paid' ? pay.amountPaid : 0);
                    }, 0) || 0;

                    setStats({ students: studentsCount, classesToday, revenue: activeMonthlyRevenue });
                }
            } catch (error) {
                console.error("Error loading stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Panel de Administración</h1>
                    <p className="text-lg text-muted-foreground mt-1">Resumen en tiempo real y navegación rápida, {currentUser?.name}.</p>
                </div>
            </div>

            {/* KPIs Section */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-50"><Users className="h-16 w-16 text-primary/20" /></div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alumnos Registrados</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold font-headline">{stats.students}</div>}
                        <p className="text-xs text-muted-foreground mt-1">Total en la base de datos</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-accent/10 via-background to-background border-accent/20 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-50"><CalendarCheck className="h-16 w-16 text-accent/20" /></div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clases Programadas Hoy</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold font-headline">{stats.classesToday}</div>}
                         <p className="text-xs text-muted-foreground mt-1">Eventos y clases regulares</p>
                    </CardContent>
                </Card>

                {canViewFinances && (
                    <Card className="bg-gradient-to-br from-green-500/10 via-background to-background border-green-500/20 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50"><TrendingUp className="h-16 w-16 text-green-500/20" /></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ingresos Totales Registrados</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-3xl font-bold text-green-600 dark:text-green-400 font-headline">€{stats.revenue.toFixed(2)}</div>}
                            <p className="text-xs text-muted-foreground mt-1">Acumulado histórico visible</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Modules Grid */}
            <div className="pt-4">
                <h3 className="text-xl font-bold mb-4 font-headline">Módulos de Gestión</h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="hover:shadow-md transition-shadow group flex flex-col">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary p-2.5 rounded-lg text-primary-foreground group-hover:scale-110 transition-transform">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Alumnos</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>Gestiona perfiles, asigna membresías y revisa pagos y asistencias.</CardDescription>
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button asChild variant="secondary" className="w-full">
                                <Link href="/admin/students">Abrir Módulo</Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow group flex flex-col">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-accent p-2.5 rounded-lg text-accent-foreground group-hover:scale-110 transition-transform">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Clases y Eventos</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>Calendario, programación de clases, talleres y alquileres.</CardDescription>
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button asChild variant="secondary" className="w-full">
                                <Link href="/admin/classes">Abrir Módulo</Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow group flex flex-col">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600 p-2.5 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Membresías</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>Crea cupones y los planes de pago que compran los estudiantes.</CardDescription>
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button asChild variant="secondary" className="w-full">
                                <Link href="/admin/memberships">Abrir Módulo</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    
                    {userRole === 'Administrativo' && (
                        <Card className="hover:shadow-md transition-shadow flex flex-col">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-600 p-2.5 rounded-lg text-white"><Banknote className="h-5 w-5" /></div>
                                    <CardTitle className="text-lg">Pagos de Alumnos</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <CardDescription>Gestiona el libro de facturas exclusivas de los alumnos.</CardDescription>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Button asChild variant="secondary" className="w-full"><Link href="/admin/payments">Abrir Módulo</Link></Button>
                            </CardFooter>
                        </Card>
                    )}

                    {canViewFinances && (
                        <Card className="hover:shadow-md transition-shadow group flex flex-col">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-600 p-2.5 rounded-lg text-white group-hover:scale-110 transition-transform">
                                        <Banknote className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Finanzas</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <CardDescription>Ingresos, gastos operativos, libro contable y nóminas de socios.</CardDescription>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href="/admin/finances">Abrir Módulo</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    <Card className="hover:shadow-md transition-shadow group flex flex-col">
                         <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-600 p-2.5 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <Users className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">Usuarios y Maestros</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>Roles, perfiles de docentes y cuentas administrativas.</CardDescription>
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button asChild variant="secondary" className="w-full">
                                <Link href="/admin/users">Abrir Módulo</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    
                    {canViewNotes && (
                        <Card className="hover:shadow-md transition-shadow group flex flex-col">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-500 p-2.5 rounded-lg text-white group-hover:scale-110 transition-transform">
                                        <StickyNote className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Notas y Tareas</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <CardDescription>Bloc de notas del equipo directivo para coordinar tareas.</CardDescription>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href="/admin/notes">Abrir Módulo</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {canViewSettings && (
                        <Card className="hover:shadow-md transition-shadow group flex flex-col">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-800 dark:bg-slate-700 p-2.5 rounded-lg text-white group-hover:scale-110 transition-transform">
                                        <Settings className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Configuración del Sitio</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <CardDescription>Ajustes de marca, horarios, banners informativos y texto.</CardDescription>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href="/admin/settings">Abrir Módulo</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                </div>
            </div>
        </div>
    );
}

