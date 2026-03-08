
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Tag, User as UserIcon, Circle, CheckCircle, Clock, Calendar as CalendarDaysIcon, Users as UsersIcon, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { TaskNote, TaskStatus, TaskPriority, User } from '@/lib/types';
import { z } from "zod"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO }from 'date-fns';
import { es } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const taskNoteSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "El título es obligatorio."),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  category: z.string().min(1, "La categoría es obligatoria."),
  assigneeIds: z.array(z.number()).default([]),
  dueDate: z.date().optional().nullable(),
  alertDateTime: z.string().optional().nullable(),
  createdAt: z.string().optional(),
});

type TaskNoteFormValues = z.infer<typeof taskNoteSchema>;

const statusMap: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  todo: { label: 'Por Hacer', icon: <Circle className="h-4 w-4" />, color: 'text-gray-500' },
  in_progress: { label: 'En Progreso', icon: <Clock className="h-4 w-4" />, color: 'text-blue-500' },
  done: { label: 'Finalizado', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' },
};

const priorityMap: Record<TaskPriority, { label: string; badgeClass: string; borderClass: string; dotClass: string; }> = {
    low: { label: 'Baja', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200', borderClass: 'border-l-4 border-blue-500', dotClass: 'bg-blue-500' },
    medium: { label: 'Media', badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', borderClass: 'border-l-4 border-yellow-500', dotClass: 'bg-yellow-500' },
    high: { label: 'Alta', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', borderClass: 'border-l-4 border-red-500', dotClass: 'bg-red-500' },
};

function TaskCard({ task, onEdit, onDelete, onStatusChange, allUsers }: { task: TaskNote; onEdit: (task: TaskNote) => void; onDelete: (taskId: string) => void; onStatusChange: (taskId: string, status: TaskStatus) => void; allUsers: User[] }) {
  const assignees = allUsers.filter(u => task.assigneeIds?.includes(u.id));
  const priorityInfo = task.priority ? priorityMap[task.priority] : priorityMap.medium;

  return (
    <Card className={cn("mb-4", priorityInfo.borderClass)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <CardTitle className="text-base font-bold pr-2">{task.title}</CardTitle>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(task)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Mover a</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {Object.entries(statusMap).map(([status, {label}]) => (
                                <DropdownMenuItem key={status} onClick={() => onStatusChange(task.id, status as TaskStatus)}>{label}</DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(task.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
            <Badge variant="outline">{task.category}</Badge>
            {task.priority && <Badge className={cn("border-none", priorityInfo.badgeClass)}>{priorityInfo.label}</Badge>}
            {task.dueDate && <Badge variant="secondary" className="flex items-center gap-1"><CalendarDaysIcon className="h-3 w-3" /> Vence: {format(parseISO(task.dueDate), 'PPP', { locale: es })}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground pb-4">
        {task.description}
      </CardContent>
      {(assignees.length > 0 || task.createdAt) && (
        <CardFooter className="pb-4 justify-between items-center text-xs text-muted-foreground">
            {task.createdAt && <span>Creada el {format(parseISO(task.createdAt), 'PPP', {locale: es})}</span>}
            <div className="flex -space-x-2">
                {assignees.map(assignee => (
                    <TooltipProvider key={assignee.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                    <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent><p>Asignado a {assignee.name}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </CardFooter>
      )}
    </Card>
  );
}

export default function NotesAndTasksPage() {
    const [tasks, setTasks] = useState<TaskNote[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskNote | null>(null);
    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [tasksRes, usersRes] = await Promise.all([
                fetch('/api/notes'),
                fetch('/api/users'),
            ]);
            if (tasksRes.ok) setTasks(await tasksRes.json());
            if (usersRes.ok) setAllUsers(await usersRes.json());
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const form = useForm<TaskNoteFormValues>({
        resolver: zodResolver(taskNoteSchema),
        defaultValues: { status: 'todo', assigneeIds: [], priority: 'medium' }
    });
    
    const managementUsers = allUsers.filter(u => u.role === 'Socio' || u.role === 'Admin' || u.role === 'Administrativo');

    const handleOpenDialog = (task: TaskNote | null = null) => {
        setEditingTask(task);
        if (task) {
            form.reset({
                ...task,
                assigneeIds: task.assigneeIds || [],
                priority: task.priority || 'medium',
                dueDate: task.dueDate ? parseISO(task.dueDate) : null,
                alertDateTime: task.alertDateTime,
            });
        } else {
            form.reset({
                title: '', description: '', status: 'todo', priority: 'medium', category: 'General',
                assigneeIds: [], dueDate: null, alertDateTime: undefined,
            });
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (data: TaskNoteFormValues) => {
        const url = editingTask ? `/api/notes/${editingTask.id}` : '/api/notes';
        const method = editingTask ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error(`Failed to ${method} task`);
            
            toast({ title: `Tarea ${editingTask ? 'actualizada' : 'creada'}` });
            await fetchData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar la tarea.", variant: "destructive" });
        } finally {
            setIsDialogOpen(false);
        }
    };
    
    const handleDelete = async (taskId: string) => {
        try {
            const response = await fetch(`/api/notes/${taskId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Failed to delete task");
            toast({ title: "Tarea eliminada", variant: "destructive" });
            await fetchData();
        } catch (error) {
            toast({ title: "Error al eliminar", description: "No se pudo eliminar la tarea.", variant: "destructive" });
        }
    }

    const handleStatusChange = async (taskId: string, status: TaskStatus) => {
        try {
            const response = await fetch(`/api/notes/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error("Failed to update status");
            await fetchData();
        } catch (error) {
             toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
        }
    };

    const columns: Record<TaskStatus, TaskNote[]> = useMemo(() => ({
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        done: tasks.filter(t => t.status === 'done'),
    }), [tasks]);
    
    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-4">
                 <div className="flex justify-between items-center"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-10 w-36" /></div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-[60vh] w-full" />
                    <Skeleton className="h-[60vh] w-full" />
                    <Skeleton className="h-[60vh] w-full" />
                 </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight font-headline">Notas y Tareas</h1>
                <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Tarea</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(statusMap).map(([statusKey, {label, icon}]) => (
                    <div key={statusKey} className="bg-muted/50 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">{icon} {label} ({columns[statusKey as TaskStatus].length})</h2>
                        <div className="space-y-4 h-[60vh] overflow-y-auto pr-2">
                            {columns[statusKey as TaskStatus].map(task => (
                                <TaskCard key={task.id} task={task} onEdit={handleOpenDialog} onDelete={handleDelete} onStatusChange={handleStatusChange} allUsers={allUsers}/>
                            ))}
                             {columns[statusKey as TaskStatus].length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-10">No hay tareas en esta columna.</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
                        <DialogDescription>Completa los detalles de la tarea o nota pendiente.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                             <FormField control={form.control} name="assigneeIds" render={({ field }) => (
                                <FormItem><FormLabel>Asignar a</FormLabel>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start font-normal">
                                            <UsersIcon className="mr-2 h-4 w-4" />
                                            {field.value?.length > 0 ? `${field.value.length} persona(s) seleccionada(s)` : 'Seleccionar...'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-2">
                                        <div className="space-y-2">
                                            {managementUsers.map(user => (
                                                <div key={user.id} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`assignee-${user.id}`}
                                                        checked={field.value?.includes(user.id)}
                                                        onCheckedChange={checked => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), user.id])
                                                                : field.onChange((field.value || []).filter(id => id !== user.id))
                                                        }}
                                                    />
                                                    <Label htmlFor={`assignee-${user.id}`}>{user.name}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage /></FormItem>
                            )} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                 <FormField control={form.control} name="category" render={({ field }) => (
                                    <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input {...field} placeholder="Ej: Evento, Compras..." /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="dueDate" render={({ field }) => (
                                  <FormItem className="flex flex-col"><FormLabel>Fecha de Vencimiento</FormLabel>
                                    <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                      {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elegir fecha</span>)}
                                      <CalendarDaysIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                      <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus locale={es}/>
                                    </PopoverContent></Popover><FormMessage />
                                  </FormItem>
                                )} />
                            </div>
                            
                            <FormField control={form.control} name="priority" render={({ field }) => (
                                <FormItem><FormLabel>Prioridad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">Baja</SelectItem>
                                        <SelectItem value="medium">Media</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage /></FormItem>
                            )} />

                            <FormField control={form.control} name="alertDateTime" render={({ field }) => (
                                <FormItem><FormLabel>Fecha y Hora de Alerta</FormLabel><FormControl><Input type="datetime-local" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
