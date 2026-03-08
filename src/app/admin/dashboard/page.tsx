
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, GraduationCap, Users, Banknote, CreditCard, Settings, ShieldCheck, Palette, Signal, StickyNote } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export default function AdminDashboardPage() {
    const { currentUser, userRole } = useAuth();
    
    const canViewFinances = userRole === 'Admin' || userRole === 'Socio';
    const canViewSettings = userRole === 'Admin' || userRole === 'Socio' || userRole === 'Administrativo';
    const canViewNotes = userRole === 'Admin' || userRole === 'Socio';

    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight font-headline">Panel de Administración</h1>
                <p className="text-lg text-muted-foreground">Bienvenido/a de nuevo, {currentUser?.name}.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                             <div className="bg-primary/10 p-3 rounded-full">
                                <GraduationCap className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>Alumnos</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Gestiona los perfiles, membresías e inscripciones de los estudiantes.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/admin/students">Gestionar Alumnos</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <ClipboardList className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>Clases y Eventos</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Crea, edita y gestiona el horario de clases, talleres y alquileres.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/admin/classes">Gestionar Clases</Link>
                        </Button>
                    </CardFooter>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>Usuarios</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Administra los usuarios del sistema (profesores, socios) y sus roles.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/admin/users">Gestionar Usuarios</Link>
                        </Button>
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <CreditCard className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>Membresías y Cupones</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Define los planes y cupones de descuento que ofreces en la academia.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/admin/memberships">Gestionar Membresías</Link>
                        </Button>
                    </CardFooter>
                </Card>
                
                 {userRole === 'Administrativo' && (
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <Banknote className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Pagos de Alumnos</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Supervisa y gestiona las facturas y pagos de los estudiantes.</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="outline">
                                <Link href="/admin/payments">Gestionar Pagos</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                 )}

                 {canViewFinances && (
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <Banknote className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Finanzas</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Supervisa los ingresos, egresos, pagos y nóminas de la academia.</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="outline">
                                <Link href="/admin/finances">Gestionar Finanzas</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                 )}
                 
                 {canViewNotes && (
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <StickyNote className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Notas y Tareas</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Organiza tareas, eventos y pendientes del equipo directivo.</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="outline">
                                <Link href="/admin/notes">Gestionar Notas</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                 )}

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <Palette className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>Estilos y Niveles</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Define los estilos y niveles de habilidad para las clases de la academia.</p>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/styles">Estilos</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/levels">Niveles</Link>
                        </Button>
                    </CardFooter>
                </Card>
                
                 {canViewSettings && (
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <Settings className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Configuración General</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Personaliza los ajustes, el contenido y la apariencia de la aplicación.</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="outline">
                                <Link href="/admin/settings">Gestionar Configuración</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                 )}
            </div>
        </div>
    );
}
