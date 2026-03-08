
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/context/auth-context";
import type { StudentPayment, DanceClass, User, MembershipPlan, DanceStyle, StudentMembership } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, parseISO, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Printer, TicketPercent, User as UserIcon, Calendar, BadgeCheck, XCircle, Clock, Pencil, Save, HandHelping, CalendarClock, Sparkles, UserPlus, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Overview } from '@/components/dashboard/overview';
import { UpcomingClasses } from '@/components/dashboard/upcoming-classes';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-context';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  name: z.string().min(3, "El nombre es obligatorio."),
  email: z.string().email("Email inválido."),
  mobile: z.string().optional(),
  avatar: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const paymentStatusLabels: Record<StudentPayment['status'], string> = {
    paid: 'Pagado',
    pending: 'Pendiente',
    deposit: 'Adelanto'
};

export default function ProfilePage() {
    const { currentUser, updateCurrentUser } = useAuth();
    const { settings } = useSettings();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [allData, setAllData] = useState<{
        users: User[];
        danceClasses: DanceClass[];
        membershipPlans: MembershipPlan[];
        studentPayments: StudentPayment[];
        studentMemberships: StudentMembership[];
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: { password: '', confirmPassword: '' }
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [usersRes, classesRes, plansRes, paymentsRes, membershipsRes] = await Promise.all([
                    fetch('/api/users'), fetch('/api/classes'), fetch('/api/memberships'), 
                    fetch('/api/payments'), fetch('/api/student-memberships')
                ]);
                const users = await usersRes.json();
                const danceClasses = await classesRes.json();
                const membershipPlans = await plansRes.json();
                const studentPayments = await paymentsRes.json();
                const studentMemberships = await membershipsRes.json();
                setAllData({ users, danceClasses, membershipPlans, studentPayments, studentMemberships });
            } catch (error) {
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    useEffect(() => {
      if (currentUser) {
        profileForm.reset({
          name: currentUser.name || '', email: currentUser.email || '',
          mobile: currentUser.mobile || '', avatar: currentUser.avatar || '',
        });
      }
    }, [currentUser, profileForm]);
    
    
    const membership = currentUser && allData ? allData.studentMemberships.find(m => m.userId === currentUser.id) as StudentMembership | null : null;
    const plan = membership && allData ? allData.membershipPlans.find(p => p.id === membership.planId) : null;
    const payment = currentUser && allData ? allData.studentPayments.find(p => p.studentId === currentUser.id && p.planId === membership?.planId) : null;
    const isMembershipActive = membership ? isBefore(new Date(), parseISO(membership.endDate)) : false;
    
    const myEnrolledClasses = useMemo(() => {
        if (!currentUser || !allData) return [];
        return allData.danceClasses.filter(c => c.enrolledStudentIds && c.enrolledStudentIds.includes(currentUser.id));
    }, [currentUser, allData]);
    
    const upcomingClassesToShow = isMembershipActive ? myEnrolledClasses : [];

    const suggestedClasses = useMemo(() => {
        if (!currentUser || !allData) return [];
        const enrolledClassIds = new Set(myEnrolledClasses.map(c => c.id));
        const enrolledStyleIds = new Set(myEnrolledClasses.map(c => c.styleId));
        const sameStyleSuggestions = allData.danceClasses.filter(c => !enrolledClassIds.has(c.id) && enrolledStyleIds.has(c.styleId) && c.type === 'recurring' && c.status === 'scheduled');
        const otherPopularStyleIds = ['salsa', 'bachata', 'hip-hop'];
        const otherStyleSuggestions = allData.danceClasses.filter(c => !enrolledClassIds.has(c.id) && !enrolledStyleIds.has(c.styleId) && otherPopularStyleIds.includes(c.styleId) && c.type === 'recurring' && c.status === 'scheduled');
        return [...sameStyleSuggestions, ...otherStyleSuggestions].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i).slice(0, 3);
    }, [currentUser, myEnrolledClasses, allData]);

    const onProfileSubmit = async (data: ProfileFormValues) => {
        if (!currentUser) return;
        try {
            const response = await fetch(`/api/users/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'No se pudo actualizar el perfil.');
            }
            const updatedUser = await response.json();
            updateCurrentUser(updatedUser);
            setIsEditing(false);
            toast({ title: "Perfil actualizado" });
        } catch (error) {
             toast({ title: "Error", description: (error as Error).message, variant: 'destructive' });
        }
    }

    const onPasswordSubmit = async (data: PasswordFormValues) => {
        if (!currentUser) return;
        try {
            const response = await fetch(`/api/users/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: data.password }),
            });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'No se pudo actualizar la contraseña.');
            }
            toast({ title: "Contraseña actualizada con éxito" });
            passwordForm.reset();
        } catch (error) {
             toast({ title: "Error", description: (error as Error).message, variant: 'destructive' });
        }
    }

    const handleAvatarClick = () => { if (isEditing) { fileInputRef.current?.click(); } };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                profileForm.setValue('avatar', reader.result as string, { shouldDirty: true });
            };
            reader.readAsDataURL(file);
        }
    };
    
    if (isLoading || !currentUser || !allData) {
        return <div className="p-8"><Skeleton className="h-screen w-full" /></div>;
    }
    
    const watchedAvatar = profileForm.watch('avatar');
    const handleEditToggle = (e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); setIsEditing(prev => !prev); }
    const handleSaveProfile = (e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); profileForm.handleSubmit(onProfileSubmit)(); }

    return (
            <div className="p-4 md:p-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Mi Perfil</h1>
                    <p className="text-lg text-muted-foreground">Bienvenido/a de nuevo, {currentUser.name.split(' ')[0]}.</p>
                </div>
                
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Mi Perfil y Membresía</TabsTrigger>
                        <TabsTrigger value="dashboard">Mi Actividad</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="dashboard" className="mt-6 space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Membresía</CardTitle><HandHelping className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{isMembershipActive && plan ? plan.title : 'Inactiva'}</div>
                                    {isMembershipActive && membership && <p className="text-xs text-muted-foreground">Expira el {format(parseISO(membership.endDate), 'PPP', {locale: es})}</p>}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Clases Restantes</CardTitle><CalendarClock className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{plan?.accessType === 'class_pack' ? membership?.classesRemaining : '∞'}</div>
                                    <p className="text-xs text-muted-foreground">{plan?.accessType === 'class_pack' ? `de tu bono` : (isMembershipActive ? 'Clases ilimitadas' : 'N/A')}</p>
                                </CardContent>
                            </Card>
                            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
                                <CardHeader><CardTitle className="text-sm font-medium">Mis Próximas Clases</CardTitle></CardHeader>
                                <CardContent><UpcomingClasses classes={upcomingClassesToShow} allUsers={allData.users} /></CardContent>
                            </Card>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader><CardTitle className="font-headline flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent"/> Clases Sugeridas</CardTitle></CardHeader>
                                <CardContent>
                                {suggestedClasses.length > 0 ? (
                                    <div className="space-y-4">
                                        {suggestedClasses.map((c) => {
                                            const teacher = allData.users.find(u => u.id === c.teacherIds[0]);
                                            return (
                                                <div key={c.id} className="flex items-center">
                                                    <Avatar className="h-10 w-10"><AvatarImage src={teacher?.avatar} alt={teacher?.name} /><AvatarFallback>{teacher?.name.charAt(0)}</AvatarFallback></Avatar>
                                                    <div className="ml-4 space-y-1">
                                                        <p className="text-sm font-medium leading-none">{c.name} ({c.levelId})</p>
                                                        <p className="text-sm text-muted-foreground">{c.day} a las {c.time}</p>
                                                    </div>
                                                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => router.push('/schedule')}><UserPlus className="mr-2 h-4 w-4" /> Inscribirse</Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-8"><p>¡Sigue así! Estás en todas las clases de tus estilos preferidos.</p></div>
                                )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="font-headline">Estadísticas</CardTitle></CardHeader>
                                <CardContent className="pl-2">
                                     <div className="text-center text-sm text-muted-foreground py-8"><p>Las estadísticas de tu progreso aparecerán aquí pronto.</p></div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="details" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <Card>
                                    <Form {...profileForm}>
                                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                                            <CardHeader><div className="flex w-full items-start justify-between"><CardTitle className="font-headline text-xl">Mis Datos</CardTitle><Button variant="ghost" size="icon" className="h-7 w-7" type="button" onClick={isEditing ? handleSaveProfile : handleEditToggle}>{isEditing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}<span className="sr-only">{isEditing ? 'Guardar' : 'Editar'}</span></Button></div></CardHeader>
                                            <CardContent>
                                                <div className="flex flex-col items-center text-center -mt-4 mb-6"><Avatar className={cn("h-24 w-24 mb-4", isEditing && "cursor-pointer hover:opacity-80")} onClick={handleAvatarClick}><AvatarImage src={watchedAvatar} alt={currentUser.name}/><AvatarFallback>{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" /></div>
                                                <div className="text-sm text-muted-foreground space-y-2">
                                                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Miembro desde {format(parseISO(currentUser.joined), 'MMMM yyyy', {locale: es})}</div>
                                                    {isEditing ? (
                                                        <div className="space-y-4 pt-4">
                                                            <FormField control={profileForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                            <FormField control={profileForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                            <FormField control={profileForm.control} name="mobile" render={({ field }) => ( <FormItem><FormLabel>Móvil</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                        </div>
                                                    ) : (
                                                        <>
                                                        <div><p className="font-medium text-foreground">{profileForm.getValues('name')}</p></div>
                                                        <div><p className="font-medium text-foreground">{profileForm.getValues('email')}</p></div>
                                                        {currentUser.mobile && <div><p className="font-medium text-foreground">{currentUser.mobile}</p></div>}
                                                        {currentUser.dob && <div>{format(parseISO(currentUser.dob), 'd MMMM, yyyy', {locale: es})}</div>}
                                                        </>
                                                    )}
                                                </div>
                                            </CardContent>
                                            {isEditing && <CardFooter><Button type="submit" className="w-full">Guardar Cambios de Perfil</Button></CardFooter>}
                                        </form>
                                    </Form>
                                </Card>
                                
                                {isEditing && (
                                    <Card>
                                        <Form {...passwordForm}>
                                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                                                <CardHeader><CardTitle className="font-headline text-xl flex items-center gap-2"><Shield className="h-5 w-5"/>Seguridad</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <FormField control={passwordForm.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>Confirmar Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                                </CardContent>
                                                <CardFooter>
                                                    <Button type="submit" className="w-full" variant="secondary" disabled={passwordForm.formState.isSubmitting}>Cambiar Contraseña</Button>
                                                </CardFooter>
                                            </form>
                                        </Form>
                                    </Card>
                                )}
                            </div>
                            <div className="lg:col-span-2">
                                <Card className="flex flex-col h-full">
                                    <CardHeader><CardTitle className="flex items-center gap-2 font-headline"><TicketPercent className="h-6 w-6 text-primary"/> Detalles de Membresía</CardTitle><CardDescription>El estado actual de tu plan y pagos.</CardDescription></CardHeader>
                                    <CardContent className="flex-grow">
                                        {membership && plan && payment ? (
                                            <div className="space-y-4">
                                                <h3 className="text-xl font-semibold">{plan.title}</h3>
                                                <div className="flex items-center gap-2">{isMembershipActive ? <Badge><BadgeCheck className="mr-1 h-4 w-4"/>Activa</Badge> : <Badge variant="destructive"><XCircle className="mr-1 h-4 w-4"/>Expirada</Badge>}<Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'pending' ? 'destructive' : 'secondary'}>{paymentStatusLabels[payment.status]}</Badge></div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t pt-4">
                                                    <div><p className="font-medium">Periodo</p><p className="text-muted-foreground">{format(parseISO(membership.startDate), 'dd/MM/yy')} - {format(parseISO(membership.endDate), 'dd/MM/yy')}</p></div>
                                                    {plan.accessType === 'class_pack' && (<div><p className="font-medium">Clases Restantes</p><p className="text-muted-foreground">{membership.classesRemaining ?? 0} / {plan.classCount}</p></div>)}
                                                    <div><p className="font-medium">Total Facturado</p><p className="text-muted-foreground">€{payment.totalAmount.toFixed(2)}</p></div>
                                                    <div><p className="font-medium">Total Pagado</p><p className="text-muted-foreground">€{payment.amountPaid.toFixed(2)}</p></div>
                                                    {payment.amountDue > 0 && (<div><p className="font-medium text-destructive">Saldo Pendiente</p><p className="text-destructive font-bold">€{payment.amountDue.toFixed(2)}</p></div>)}
                                                </div>
                                                {payment.notes && <div className="text-sm pt-4 border-t"><p className="font-medium">Notas</p><p className="text-muted-foreground whitespace-pre-wrap">{payment.notes}</p></div>}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8"><p className="text-muted-foreground">No tienes una membresía activa.</p><Button className="mt-4" onClick={() => router.push('/memberships')}>Ver Planes</Button></div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        )
}
