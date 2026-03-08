
'use client';

import { useState, useEffect } from 'react';
import type { User, DanceClass, StudentMembership, MembershipPlan } from '@/lib/types';
import { format, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, PlusCircle, TicketPercent, List, CalendarCheck, CalendarX, Pencil, Save, Calendar as CalendarIcon, Download, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { BirthdayCalendar } from '@/components/admin/birthday-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';


const studentEditFormSchema = z.object({
    id: z.number(),
    name: z.string().min(3, "El nombre es obligatorio."),
    email: z.string().email("Introduce un email válido."),
    mobile: z.string().optional(),
    dob: z.string().optional(),
    
    membershipPlanId: z.string().optional().nullable(),
    membershipStartDate: z.date().optional().nullable(),
    membershipEndDate: z.date().optional().nullable(),
    membershipClassesRemaining: z.coerce.number().optional().nullable(),
}).refine(data => {
    // If a plan is selected AND one of the dates is filled, then both dates must be filled.
    if (data.membershipPlanId && data.membershipPlanId !== 'none' && (data.membershipStartDate || data.membershipEndDate)) {
        return !!data.membershipStartDate && !!data.membershipEndDate;
    }
    // Otherwise, it's valid (no plan, or a plan with no dates yet).
    return true;
}, {
    message: "Si se define una fecha, ambas (inicio y fin) son obligatorias.",
    path: ["membershipStartDate"],
});


type StudentEditFormValues = z.infer<typeof studentEditFormSchema>;


export default function AdminStudentsPage() {
    const [students, setStudents] = useState<User[]>([]);
    const [studentMemberships, setStudentMemberships] = useState<StudentMembership[]>([]);
    const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
    const [danceClasses, setDanceClasses] = useState<DanceClass[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();
    const { currentUser, updateCurrentUser } = useAuth();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [usersRes, membershipsRes, plansRes, classesRes] = await Promise.all([
                fetch('/api/users'), fetch('/api/student-memberships'), 
                fetch('/api/memberships'), fetch('/api/classes')
            ]);
            
            if (usersRes.ok) {
                const allUsers = await usersRes.json();
                setUsers(allUsers);
                setStudents(allUsers.filter((u: User) => u.role === 'Estudiante'));
            }
            if (membershipsRes.ok) setStudentMemberships(await membershipsRes.json());
            if (plansRes.ok) setMembershipPlans(await plansRes.json());
            if (classesRes.ok) setDanceClasses(await classesRes.json());
            
        } catch (error) {
            console.error("Failed to fetch student data:", error);
            toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);


    const form = useForm<StudentEditFormValues>({
        resolver: zodResolver(studentEditFormSchema),
    });
    
    const getTeacherNames = (ids: number[]) => users.filter(u => ids.includes(u.id)).map(t => t.name).join(', ');

    const watchedPlanId = form.watch('membershipPlanId');
    const selectedPlanDetails = membershipPlans.find(p => p.id === watchedPlanId);

    const handleViewProfile = (student: User) => {
        setSelectedStudent(student);
        const membership = studentMemberships.find(sm => sm.userId === student.id);
        
        form.reset({
            id: student.id,
            name: student.name,
            email: student.email,
            mobile: student.mobile || '',
            dob: student.dob || '',
            membershipPlanId: membership?.planId || 'none',
            membershipStartDate: membership ? new Date(membership.startDate) : null,
            membershipEndDate: membership ? new Date(membership.endDate) : null,
            membershipClassesRemaining: membership?.classesRemaining ?? undefined,
        });

        setIsEditing(false);
        setIsDetailOpen(true);
    };
    
    const onSubmit = async (data: StudentEditFormValues) => {
        try {
            const response = await fetch(`/api/users/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'No se pudo actualizar el alumno.');
            }
            
            const updatedStudentDetails: User = await response.json();
            
            toast({
                title: "Alumno actualizado",
                description: "Los datos del alumno han sido guardados en la base de datos."
            });
            
            await fetchData();
            setSelectedStudent(updatedStudentDetails);

            // If the admin is editing their own student profile, update the context
            if (currentUser && currentUser.id === updatedStudentDetails.id) {
                updateCurrentUser(updatedStudentDetails);
            }

            setIsEditing(false);
        } catch (error) {
            toast({
                title: "Error al guardar",
                description: (error as Error).message,
                variant: "destructive"
            });
        }
    }

    const getStudentMembershipInfo = (studentId: number) => {
        const membership = studentMemberships.find(sm => sm.userId === studentId);
        if (!membership) {
            return { planTitle: 'Sin membresía', status: 'Inactiva', statusColor: 'text-red-500' };
        }
        
        const plan = membershipPlans.find(p => p.id === membership.planId);
        const endDate = parseISO(membership.endDate);
        const isActive = isBefore(new Date(), endDate);

        let statusText = `Expira el ${format(endDate, 'PPP', { locale: es })}`;
        if (!isActive) {
            statusText = `Expiró el ${format(endDate, 'PPP', { locale: es })}`;
        }
        
        if(plan?.accessType === 'class_pack' && membership.classesRemaining !== undefined) {
             statusText += ` - ${membership.classesRemaining} clases restantes`;
        }

        return {
            planTitle: plan?.title || 'Plan Desconocido',
            status: statusText,
            statusColor: isActive ? 'text-green-600' : 'text-red-500',
        };
    };
    
    const getEnrolledClasses = (studentId: number): DanceClass[] => {
        return danceClasses.filter(c => c.enrolledStudentIds.includes(studentId));
    };

    const getClassNameById = (classId: string) => {
        return danceClasses.find(c => c.id === classId)?.name || 'Clase desconocida';
    }

    const currentMembership = selectedStudent ? studentMemberships.find(sm => sm.userId === selectedStudent.id) : null;
    const currentPlan = currentMembership ? membershipPlans.find(p => p.id === currentMembership.planId) : null;
    const enrolledClasses = selectedStudent ? getEnrolledClasses(selectedStudent.id) : [];

    const handleExportCSV = () => {
        const headers = ["ID", "Nombre", "Email", "Membresia", "Estado", "Fecha Fin Membresia", "Clases Restantes"];
        const csvRows = [headers.join(',')];
        
        students.forEach(student => {
          const membershipInfo = getStudentMembershipInfo(student.id);
          const membership = studentMemberships.find(sm => sm.userId === student.id);
          const plan = membership ? membershipPlans.find(p => p.id === membership.planId) : null;
          
          const row = [
            student.id,
            `"${student.name}"`,
            student.email,
            `"${membershipInfo.planTitle}"`,
            membership ? (isBefore(new Date(), parseISO(membership.endDate)) ? 'Activa' : 'Expirada') : 'Sin membresía',
            membership ? membership.endDate : 'N/A',
            (plan?.accessType === 'class_pack' && membership?.classesRemaining !== undefined) ? membership.classesRemaining : 'N/A'
          ].map(field => (typeof field === 'string' ? field.replace(/"/g, '""') : field)).join(',');
          csvRows.push(row);
        });
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', 'alumnos_fusionarte.csv');
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePrintReceipt = () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow && selectedStudent && currentPlan && currentMembership) {
            printWindow.document.write('<html><head><title>Comprobante de Membresía</title>');
            printWindow.document.write('<style>body { font-family: sans-serif; margin: 2rem; } .receipt { border: 1px solid #ccc; padding: 1.5rem; border-radius: 8px; } h1 { text-align: center; } table { width: 100%; border-collapse: collapse; margin-top: 1rem; } td { padding: 0.5rem; border-bottom: 1px solid #eee; }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write('<div class="receipt">');
            printWindow.document.write('<h1>Comprobante de Membresía - FusionArte</h1>');
            printWindow.document.write('<hr>');
            printWindow.document.write('<table>');
            printWindow.document.write(`<tr><td><strong>Alumno:</strong></td><td>${selectedStudent.name}</td></tr>`);
            printWindow.document.write(`<tr><td><strong>Plan:</strong></td><td>${currentPlan.title}</td></tr>`);
            if ('price' in currentPlan && typeof currentPlan.price === 'number') {
              printWindow.document.write(`<tr><td><strong>Precio:</strong></td><td>€${currentPlan.price.toFixed(2)}</td></tr>`);
            }
            printWindow.document.write(`<tr><td><strong>Fecha de Inicio:</strong></td><td>${format(parseISO(currentMembership.startDate), 'PPP', { locale: es })}</td></tr>`);
            printWindow.document.write(`<tr><td><strong>Fecha de Vencimiento:</strong></td><td>${format(parseISO(currentMembership.endDate), 'PPP', { locale: es })}</td></tr>`);
            if (currentPlan.accessType === 'class_pack' && 'classCount' in currentPlan) {
                printWindow.document.write(`<tr><td><strong>Clases Incluidas:</strong></td><td>${currentPlan.classCount}</td></tr>`);
                printWindow.document.write(`<tr><td><strong>Clases Restantes:</strong></td><td>${currentMembership.classesRemaining ?? currentPlan.classCount}</td></tr>`);
            }
            printWindow.document.write('</table>');
            printWindow.document.write('<p style="margin-top: 2rem; text-align: center; font-size: 0.8rem; color: #666;">¡Gracias por ser parte de nuestra comunidad!</p>');
            printWindow.document.write('</div>');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        } else {
            toast({
                title: "Error al imprimir",
                description: "No se pudo generar el comprobante. Asegúrate de que el alumno tenga una membresía activa.",
                variant: "destructive",
            });
        }
    };
    
    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

  return (
    <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-2 no-print">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Gestión de Alumnos</h1>
        </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <CardTitle>Alumnos Registrados</CardTitle>
                            <CardDescription>Aquí puedes ver y editar los perfiles de los estudiantes.</CardDescription>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 flex-wrap no-print">
                            <Button variant="outline" size="sm" onClick={handleExportCSV}>
                                <Download className="mr-2 h-4 w-4" /> Exportar CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Membresía</TableHead>
                        <TableHead className="hidden md:table-cell">Estado</TableHead>
                        <TableHead className="no-print">
                        <span className="sr-only">Acciones</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {students.map((student) => {
                        const { planTitle, status, statusColor } = getStudentMembershipInfo(student.id);
                        return (
                            <TableRow key={student.id}>
                            <TableCell>
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person face" />
                                        <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <Badge variant="secondary">{planTitle}</Badge>
                            </TableCell>
                            <TableCell className={`hidden md:table-cell text-sm font-medium ${statusColor}`}>{status}</TableCell>
                            <TableCell className="no-print">
                                <Button variant="ghost" size="icon" onClick={() => handleViewProfile(student)}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">Ver Perfil</span>
                                </Button>
                            </TableCell>
                            </TableRow>
                        )
                    })}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 no-print">
            <BirthdayCalendar />
        </div>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen} modal={true}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col no-print">
            {selectedStudent && (
            <>
                <DialogHeader className="no-print">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={selectedStudent.avatar} alt={selectedStudent.name} />
                                <AvatarFallback>{selectedStudent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                                <DialogTitle className="text-2xl font-headline">{form.getValues('name')}</DialogTitle>
                                <DialogDescription>{form.getValues('email')} - Miembro desde {format(parseISO(selectedStudent.joined), 'PPP', { locale: es })}</DialogDescription>
                            </div>
                        </div>
                        <Button variant={isEditing ? "default" : "outline"} size="icon" onClick={() => setIsEditing(!isEditing)}>
                           {isEditing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                           <span className="sr-only">{isEditing ? 'Guardar' : 'Editar'}</span>
                        </Button>
                    </div>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto -mx-6 px-6 py-4 pr-4 -mr-2">
                    {isEditing ? (
                        <Form {...form}>
                            <form id="student-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Detalles Personales</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name="name" render={({ field }) => (
                                            <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="email" render={({ field }) => (
                                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="mobile" render={({ field }) => (
                                                <FormItem><FormLabel>Móvil</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="dob" render={({ field }) => (
                                                <FormItem><FormLabel>Fecha de Nacimiento</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Membresía</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name="membershipPlanId" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Plan de Membresía</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar plan..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">Sin membresía</SelectItem>
                                                        {membershipPlans.filter(plan => !!plan.id).map(plan => <SelectItem key={plan.id} value={plan.id!}>{plan.title}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        {watchedPlanId && watchedPlanId !== 'none' && (
                                             <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="membershipStartDate" render={({ field }) => (
                                                    <FormItem className="flex flex-col"><FormLabel>Fecha de Inicio</FormLabel>
                                                    <Popover><PopoverTrigger asChild>
                                                        <FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button></FormControl>
                                                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                                        <CalendarComponent mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus locale={es}/>
                                                    </PopoverContent></Popover><FormMessage />
                                                  </FormItem>
                                                )} />
                                                <FormField control={form.control} name="membershipEndDate" render={({ field }) => (
                                                    <FormItem className="flex flex-col"><FormLabel>Fecha de Fin</FormLabel>
                                                    <Popover><PopoverTrigger asChild>
                                                        <FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button></FormControl>
                                                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                                        <CalendarComponent mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus locale={es}/>
                                                    </PopoverContent></Popover><FormMessage />
                                                  </FormItem>
                                                )} />
                                                {selectedPlanDetails?.accessType === 'class_pack' && (
                                                    <FormField control={form.control} name="membershipClassesRemaining" render={({ field }) => (
                                                        <FormItem className="col-span-2">
                                                            <FormLabel>Clases Restantes</FormLabel>
                                                            <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                )}
                                             </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </form>
                        </Form>
                    ) : (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Detalles Personales</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="font-medium">Nombre</p><p>{selectedStudent.name}</p></div>
                                    <div><p className="font-medium">Email</p><p>{selectedStudent.email}</p></div>
                                    <div><p className="font-medium">Móvil</p><p>{selectedStudent.mobile || 'No especificado'}</p></div>
                                    <div><p className="font-medium">Fecha de Nacimiento</p><p>{selectedStudent.dob ? format(parseISO(selectedStudent.dob), 'PPP', {locale: es}) : 'No especificado'}</p></div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row justify-between items-center">
                                    <CardTitle className="text-lg flex items-center gap-2"><TicketPercent className="h-5 w-5"/>Membresía Actual</CardTitle>
                                    <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Imprimir Comprobante
                                    </Button>
                                </CardHeader>
                                {currentPlan && currentMembership ? (
                                    <CardContent className="text-sm space-y-2">
                                        <p className="font-semibold text-base">{currentPlan.title}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={isBefore(new Date(), parseISO(currentMembership.endDate)) ? 'default' : 'destructive'}>
                                                {isBefore(new Date(), parseISO(currentMembership.endDate)) ? 'Activa' : 'Expirada'}
                                            </Badge>
                                        </div>
                                        <p><span className="font-medium">Válida desde:</span> {format(parseISO(currentMembership.startDate), 'PPP', { locale: es })}</p>
                                        <p><span className="font-medium">Hasta:</span> {format(parseISO(currentMembership.endDate), 'PPP', { locale: es })}</p>
                                        {currentPlan.accessType === 'class_pack' && (
                                            <p><span className="font-medium">Clases restantes:</span> {currentMembership.classesRemaining ?? 0}</p>
                                        )}
                                    </CardContent>
                                ) : (
                                    <CardContent><p className="text-sm text-muted-foreground">Este alumno no tiene una membresía activa.</p></CardContent>
                                )}
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><List className="h-5 w-5"/>Clases Inscritas</CardTitle></CardHeader>
                                <CardContent>
                                    {enrolledClasses.length > 0 ? (
                                        <ul className="space-y-3">
                                            {enrolledClasses.map(c => (
                                                <li key={c.id} className="text-sm flex justify-between items-center">
                                                    <div><p className="font-medium">{c.name}</p><p className="text-muted-foreground">{c.day} - {c.time} con {getTeacherNames(c.teacherIds)}</p></div>
                                                    <Badge variant="outline">{c.levelId}</Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No está inscrito/a en ninguna clase actualmente.</p>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CalendarCheck className="h-5 w-5"/>Historial de Asistencia</CardTitle></CardHeader>
                                <CardContent>
                                    {selectedStudent.attendanceHistory && selectedStudent.attendanceHistory.length > 0 ? (
                                        <ul className="space-y-3">
                                            {selectedStudent.attendanceHistory.map((att, index) => (
                                                <li key={index} className="text-sm flex justify-between items-center">
                                                    <div><p className="font-medium">{getClassNameById(att.classId)}</p><p className="text-muted-foreground">{format(parseISO(att.date), 'PPP', { locale: es })}</p></div>
                                                    <Badge variant={att.status === 'presente' ? 'default' : 'destructive'} className="capitalize">
                                                        {att.status === 'presente' ? <CalendarCheck className="mr-1 h-3 w-3" /> : <CalendarX className="mr-1 h-3 w-3" />}
                                                        {att.status}
                                                    </Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No hay registros de asistencia.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
                <DialogFooter className="no-print">
                    {isEditing && (
                        <>
                            <Button type="button" variant="ghost" onClick={() => { setIsEditing(false); }}>Cancelar</Button>
                            <Button type="submit" form="student-edit-form" onClick={form.handleSubmit(onSubmit)}>Guardar Cambios</Button>
                        </>
                    )}
                </DialogFooter>
            </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
