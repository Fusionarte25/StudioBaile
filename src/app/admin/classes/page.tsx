'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { DanceClass, ClassType, User, DanceStyle, DanceLevel } from '@/lib/types';
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Calendar, Clock, Calendar as CalendarIcon, Users, ClipboardCheck, Palette, Signal, Building, Download, Printer, XCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const classFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio."),
  type: z.enum(['recurring', 'one-time', 'workshop', 'rental'], { required_error: "Debes seleccionar un tipo." }),
  
  // Fields for classes/workshops
  styleId: z.string().optional(),
  levelId: z.string().optional(),
  teacherIds: z.array(z.number()).optional(),
  capacity: z.coerce.number().optional(),

  // Fields for recurring
  day: z.string().optional(),
  
  // Fields for one-time events
  date: z.date().optional(),
  
  // Fields for workshop
  workshopPaymentType: z.enum(['fixed', 'percentage']).optional(),
  workshopPaymentValue: z.coerce.number().optional(),

  // Fields for rental
  rentalContact: z.string().optional(),
  rentalPrice: z.coerce.number().optional(),
  isVisibleToStudents: z.boolean().default(false),
  
  // Common fields
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)."),
  room: z.string().min(1, "La sala es obligatoria."),
  duration: z.string().min(1, "La duración es obligatoria."),
  enrolledStudentIds: z.array(z.number()).default([]),
  cancellationPolicyHours: z.coerce.number().optional(),
}).refine(data => {
    if (['recurring', 'one-time', 'workshop'].includes(data.type)) {
        return !!data.styleId && !!data.levelId && !!data.teacherIds && data.teacherIds.length > 0 && data.capacity !== undefined && data.capacity > 0;
    }
    return true;
}, { message: "Estilo, nivel, profesor y capacidad son obligatorios para este tipo de evento.", path: ["teacherIds"] })
.refine(data => {
    if (data.type === 'recurring') {
        return !!data.day;
    }
    return true;
}, { message: "El día es obligatorio para clases recurrentes.", path: ["day"] })
.refine(data => {
    if (['one-time', 'workshop', 'rental'].includes(data.type)) {
        return !!data.date;
    }
    return true;
}, { message: "La fecha es obligatoria para este tipo de evento.", path: ["date"] })
.refine(data => {
    if (data.type === 'workshop') {
        return !!data.workshopPaymentType && data.workshopPaymentValue !== undefined;
    }
    return true;
}, { message: "El tipo y valor de pago son obligatorios para talleres.", path: ["workshopPaymentType"] })
.refine(data => {
    if (data.type === 'rental') {
        return !!data.rentalContact && data.rentalPrice !== undefined && data.rentalPrice > 0;
    }
    return true;
}, { message: "El nombre del responsable y el precio del alquiler son obligatorios.", path: ["rentalContact"] });


type ClassFormValues = z.infer<typeof classFormSchema>;

const availableDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const eventTypeLabels: Record<ClassType, string> = {
    recurring: 'Clase Recurrente',
    'one-time': 'Clase Única',
    workshop: 'Taller',
    rental: 'Alquiler de Sala'
};

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<DanceClass[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [danceStyles, setDanceStyles] = useState<DanceStyle[]>([]);
  const [danceLevels, setDanceLevels] = useState<DanceLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<DanceClass | null>(null);
  const [classToCancel, setClassToCancel] = useState<DanceClass | null>(null);
  const [cancelReason, setCancelReason] = useState<'cancelled-low-attendance' | 'cancelled-teacher'>('cancelled-low-attendance');
  const [hideOnSchedule, setHideOnSchedule] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [classesRes, usersRes, stylesRes, levelsRes] = await Promise.all([
            fetch('/api/classes'),
            fetch('/api/users'),
            fetch('/api/styles'),
            fetch('/api/levels'),
        ]);
        
        if (classesRes.ok) setClasses(await classesRes.json());
        if (usersRes.ok) setUsers(await usersRes.json());
        if (stylesRes.ok) setDanceStyles(await stylesRes.json());
        if (levelsRes.ok) setDanceLevels(await levelsRes.json());
    } catch (error) {
        console.error("Failed to fetch initial data for classes page", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [searchParams]);


  const teachers = users.filter(u => u.role === 'Profesor' || u.role === 'Socio');

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      type: 'recurring',
      time: '19:00',
      duration: '60 min',
      capacity: 20,
      enrolledStudentIds: [],
      teacherIds: [],
      isVisibleToStudents: false,
      workshopPaymentType: 'fixed',
      cancellationPolicyHours: 24,
    },
  });

  const eventType = form.watch('type');
  const workshopPaymentType = form.watch('workshopPaymentType');

  const getStyleName = (id: string) => danceStyles.find(s => s.id === id)?.name || id;
  const getLevelName = (id: string) => danceLevels.find(l => l.id === id)?.name || id;
  const getTeacherNames = (ids: number[]) => users.filter(u => ids.includes(u.id)).map(t => t.name).join(', ');

  const handleOpenDialog = (danceClass: DanceClass | null = null) => {
    setEditingClass(danceClass);
    if (danceClass) {
      form.reset({
        ...danceClass,
        date: danceClass.date ? parseISO(danceClass.date) : undefined,
        capacity: danceClass.capacity || undefined,
        rentalContact: danceClass.rentalContact,
        rentalPrice: danceClass.rentalPrice || undefined,
        workshopPaymentValue: danceClass.workshopPaymentValue || undefined,
        cancellationPolicyHours: danceClass.cancellationPolicyHours || 24,
        // Make sure teacherIds is an array of numbers
        teacherIds: Array.isArray(danceClass.teacherIds) ? danceClass.teacherIds : [],
      });
    } else {
      form.reset({
        name: '',
        type: 'recurring',
        time: '19:00',
        duration: '60 min',
        capacity: 20,
        date: new Date(),
        enrolledStudentIds: [],
        teacherIds: [],
        isVisibleToStudents: false,
        workshopPaymentType: 'fixed',
        cancellationPolicyHours: 24,
      });
    }
    setIsDialogOpen(true);
  };
  
  const handleOpenCancelDialog = (danceClass: DanceClass) => {
    setClassToCancel(danceClass);
  };

  const onSubmit = async (data: ClassFormValues) => {
    const isOverlapping = classes.some(c => {
        if (editingClass && c.id === editingClass.id) return false;
        if (c.room !== data.room) return false;
        const cDate = c.date ? format(parseISO(c.date), 'yyyy-MM-dd') : null;
        const dataDate = data.date ? format(data.date, 'yyyy-MM-dd') : null;
        const dateMatch = (c.type !== 'recurring' && data.type !== 'recurring' && cDate && dataDate && cDate === dataDate);
        const dayMatch = (c.type === 'recurring' && data.type === 'recurring' && c.day === data.day);
        return (dateMatch || dayMatch) && c.time === data.time;
    });

    if (isOverlapping) {
        toast({ title: "Conflicto de Horario", description: "La sala ya está reservada.", variant: "destructive" });
        return;
    }
    
    let finalData: any = {
      ...data,
      date: data.date ? data.date.toISOString() : undefined,
      status: 'scheduled',
    };

    if (finalData.type === 'rental') {
        finalData.teacherIds = [];
        finalData.styleId = 'practica'; // Default for rentals
        finalData.levelId = 'todos';    // Default for rentals
        finalData.capacity = 0;
    }
    
    const url = editingClass ? `/api/classes/${editingClass.id}` : '/api/classes';
    const method = editingClass ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalData) });
        if (!response.ok) throw new Error(`Failed to ${method} class`);
        
        await fetchData(); // Refetch data from the server

        toast({ title: `Evento ${editingClass ? 'actualizado' : 'creado'}`, description: `El evento "${data.name}" ha sido guardado.` });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo guardar el evento.", variant: "destructive" });
    } finally {
        setIsDialogOpen(false); 
        setEditingClass(null);
    }
  };
  
  const handleDelete = async (classId: string) => {
    try {
        const response = await fetch(`/api/classes/${classId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete");
        setClasses(classes.filter(c => c.id !== classId));
        toast({ title: "Evento eliminado", variant: "destructive" });
    } catch(e) {
        toast({ title: "Error", description: "No se pudo eliminar el evento.", variant: "destructive" });
    }
  }
  
  const handleConfirmCancel = async () => {
    if (!classToCancel) return;
    try {
        const updatedClass = { ...classToCancel, status: cancelReason, isCancelledAndHidden: hideOnSchedule };
        const response = await fetch(`/api/classes/${classToCancel.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedClass) });
        if (!response.ok) throw new Error("Failed to cancel");
        
        await fetchData(); // Refetch data

        toast({ title: "Clase cancelada" });
    } catch(e) {
        toast({ title: "Error", description: "No se pudo cancelar la clase.", variant: "destructive" });
    } finally {
        setClassToCancel(null);
    }
  }

  const handleExportCSV = () => {
    const headers = ["ID", "Evento", "Tipo", "Profesor/Responsable", "Dia/Fecha", "Hora", "Sala"];
    const csvRows = [headers.join(',')];
    classes.forEach(danceClass => {
      const row = [ danceClass.id, `"${danceClass.name}"`, `"${eventTypeLabels[danceClass.type]}"`, `"${danceClass.type === 'rental' ? danceClass.rentalContact : getTeacherNames(danceClass.teacherIds)}"`,
        danceClass.type === 'recurring' ? (danceClass.day || 'N/A') : (danceClass.date ? format(parseISO(danceClass.date), 'yyyy-MM-dd') : 'N/A'),
        danceClass.time, danceClass.room ].map(field => (typeof field === 'string' ? field.replace(/"/g, '""') : field)).join(',');
      csvRows.push(row);
    });
    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'clases_fusionarte.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
        <div className="p-4 md:p-8 space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-10 w-48" />
            </div>
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
        <h1 className="text-3xl font-bold tracking-tight font-headline">Gestión de Clases y Eventos</h1>
        <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => router.push('/admin/styles')}>
                <Palette className="mr-2 h-4 w-4" />
                Gestionar Estilos
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/levels')}>
                <Signal className="mr-2 h-4 w-4" />
                Gestionar Niveles
            </Button>
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Evento
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <CardTitle>Listado de Eventos</CardTitle>
              <CardDescription>Añade, edita o elimina clases, talleres y alquileres.</CardDescription>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="hidden sm:table-cell">Responsable/Profesor</TableHead>
                  <TableHead className="hidden md:table-cell">Horario y Tipo</TableHead>
                  <TableHead className="no-print">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((danceClass) => (
                  <TableRow key={danceClass.id} className={danceClass.status && danceClass.status.startsWith('cancelled') ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                    <TableCell>
                      <p className="font-medium">{danceClass.name}</p>
                      {danceClass.type !== 'rental' && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{getLevelName(danceClass.levelId)}</Badge>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {danceClass.capacity} cupos</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{danceClass.type === 'rental' ? danceClass.rentalContact : getTeacherNames(danceClass.teacherIds)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                           {danceClass.type === 'recurring' ? <Calendar className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
                           {danceClass.type === 'recurring' ? `${danceClass.day}, ${danceClass.time}` : `${danceClass.date ? format(parseISO(danceClass.date), "PPP", { locale: es }) : 'N/A'}, ${danceClass.time}`}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                           {danceClass.type === 'rental' ? <Building className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                           {eventTypeLabels[danceClass.type]}
                        </div>
                    </TableCell>
                    <TableCell className="no-print">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(danceClass)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          {danceClass.type !== 'rental' && (
                          <DropdownMenuItem onClick={() => router.push(`/admin/classes/${danceClass.id}/attendance?date=${format(new Date(), 'yyyy-MM-dd')}`)}>
                            <ClipboardCheck className="mr-2 h-4 w-4" /> Tomar Asistencia
                          </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOpenCancelDialog(danceClass)}>
                            <XCircle className="mr-2 h-4 w-4" /> Cancelar
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="no-print">
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente el evento.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(danceClass.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={true}>
        <DialogContent className="sm:max-w-2xl no-print">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Editar Evento' : 'Añadir Nuevo Evento'}</DialogTitle>
            <DialogDescription>
              {editingClass ? 'Modifica los detalles del evento.' : 'Rellena los detalles para crear un nuevo evento.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Tipo de Evento</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="recurring">Clase Recurrente</SelectItem>
                      <SelectItem value="one-time">Clase Única</SelectItem>
                      <SelectItem value="workshop">Taller</SelectItem>
                      <SelectItem value="rental">Alquiler de Sala</SelectItem>
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Nombre del Evento</FormLabel><FormControl><Input {...field} placeholder={
                      eventType === 'rental' ? "Ej: Alquiler para Ensayo" :
                      eventType === 'workshop' ? "Ej: Taller de Bachata Dominicana" :
                      "Ej: Salsa Lady Style"
                  } /></FormControl><FormMessage /></FormItem>
                )} />

                {['recurring', 'one-time', 'workshop'].includes(eventType) && (
                  <>
                    <FormField control={form.control} name="styleId" render={({ field }) => (
                      <FormItem><FormLabel>Estilo de Baile</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un estilo" /></SelectTrigger></FormControl>
                        <SelectContent>{danceStyles.map(style => <SelectItem key={style.id} value={style.id}>{style.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="levelId" render={({ field }) => (
                      <FormItem><FormLabel>Nivel</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un nivel" /></SelectTrigger></FormControl>
                        <SelectContent>{danceLevels.map(lvl => <SelectItem key={lvl.id} value={lvl.id}>{lvl.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <FormField
                        control={form.control}
                        name="teacherIds"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                            <FormLabel>Profesor/es</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value?.length && "text-muted-foreground")}>
                                            {field.value?.length ? `${field.value.length} seleccionado(s)` : "Seleccionar profesores"}
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                       <ScrollArea className="h-48">
                                         {teachers.map((teacher) => (
                                            <div key={teacher.id} className="flex items-center space-x-2 p-2">
                                                <Checkbox
                                                    id={`teacher-${teacher.id}`}
                                                    checked={field.value?.includes(teacher.id)}
                                                    onCheckedChange={(checked) => {
                                                        const currentIds = field.value || [];
                                                        return checked
                                                        ? field.onChange([...currentIds, teacher.id])
                                                        : field.onChange(currentIds.filter((id) => id !== teacher.id));
                                                    }}
                                                />
                                                <Label htmlFor={`teacher-${teacher.id}`} className="font-normal">{teacher.name}</Label>
                                            </div>
                                         ))}
                                       </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField control={form.control} name="capacity" render={({ field }) => (
                        <FormItem><FormLabel>Capacidad</FormLabel><FormControl><Input type="number" min="1" {...field} placeholder="20" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </>
                )}
                
                {eventType === 'recurring' && (
                    <FormField control={form.control} name="day" render={({ field }) => (
                        <FormItem><FormLabel>Día de la semana</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un día" /></SelectTrigger></FormControl>
                        <SelectContent>{availableDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                )}

                {['one-time', 'workshop', 'rental'].includes(eventType) && (
                   <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col md:col-span-2">
                        <FormLabel>Fecha del Evento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              >
                                {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elige una fecha</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={(date) => date < new Date("2000-01-01")} initialFocus locale={es}/>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {eventType === 'workshop' && (
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 border p-4 rounded-md">
                        <FormField control={form.control} name="workshopPaymentType" render={({ field }) => (
                            <FormItem><FormLabel>Tipo de Pago al Profesor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="fixed">Monto Fijo (€)</SelectItem>
                                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                                </SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="workshopPaymentValue" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{workshopPaymentType === 'fixed' ? 'Monto Fijo (€)' : 'Porcentaje (%)'}</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
                
                {eventType === 'rental' && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md items-center">
                        <FormField control={form.control} name="rentalContact" render={({ field }) => (
                            <FormItem><FormLabel>Responsable/Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="rentalPrice" render={({ field }) => (
                            <FormItem><FormLabel>Precio del Alquiler (€)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="isVisibleToStudents" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-fit mt-auto md:col-span-2">
                                <div className="space-y-0.5"><FormLabel>Visible a Alumnos</FormLabel></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                )}

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="time" render={({ field }) => (
                        <FormItem><FormLabel>Hora (HH:MM)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="room" render={({ field }) => (
                        <FormItem><FormLabel>Sala</FormLabel><FormControl><Input {...field} placeholder="Ej: Estudio 1" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="duration" render={({ field }) => (
                        <FormItem><FormLabel>Duración</FormLabel><FormControl><Input {...field} placeholder="Ej: 60 min" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="cancellationPolicyHours" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cancelar antes de (h)</FormLabel>
                            <FormControl><Input type="number" min="0" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                     )} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Guardar Cambios</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!classToCancel} onOpenChange={(isOpen) => !isOpen && setClassToCancel(null)}>
        <AlertDialogContent className="no-print">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Clase</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cancelar la clase "{classToCancel?.name}"? Esta acción afectará a la nómina del profesor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="cancel-reason">Motivo de la cancelación</Label>
                <Select value={cancelReason} onValueChange={(value) => setCancelReason(value as any)}>
                    <SelectTrigger id="cancel-reason"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cancelled-low-attendance">Cancelada por baja asistencia</SelectItem>
                        <SelectItem value="cancelled-teacher">Cancelada por el profesor</SelectItem>
                    </SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground">
                    Esto determina si se aplica la compensación por cancelación al profesor.
                </p>
            </div>
            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <Label htmlFor="hide-on-schedule">Ocultar del horario público</Label>
                    <p className="text-xs text-muted-foreground">Si se activa, la clase cancelada no aparecerá en el calendario general.</p>
                </div>
                <Switch
                    id="hide-on-schedule"
                    checked={hideOnSchedule}
                    onCheckedChange={setHideOnSchedule}
                />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClassToCancel(null)}>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>Confirmar Cancelación</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
