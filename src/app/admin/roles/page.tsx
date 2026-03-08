
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { Role, Permission } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/shared/back-button';

const roleFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio."),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Debes seleccionar al menos un permiso.",
  }),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

const availablePermissions: { id: Permission; label: string; description: string }[] = [
  { id: 'view_dashboard', label: 'Ver Dashboard', description: 'Acceso a la vista principal del dashboard.' },
  { id: 'manage_users', label: 'Gestionar Usuarios', description: 'Crear, editar y eliminar cualquier usuario (profesores, admins, etc).' },
  { id: 'manage_students', label: 'Gestionar Alumnos', description: 'Ver y editar perfiles de alumnos, membresías y asistencias.' },
  { id: 'manage_classes', label: 'Gestionar Clases', description: 'Crear, editar y eliminar clases, talleres y alquileres.' },
  { id: 'manage_memberships', label: 'Gestionar Membresías', description: 'Crear, editar y eliminar planes de membresía.' },
  { id: 'manage_finances', label: 'Gestionar Finanzas', description: 'Acceso a nóminas, libro de transacciones y balance.' },
  { id: 'manage_settings', label: 'Gestionar Configuración', description: 'Editar los ajustes generales de la academia.' },
  { id: 'manage_roles', label: 'Gestionar Roles', description: 'Crear, editar y asignar permisos a los roles.' },
  { id: 'view_teacher_area', label: 'Ver Área de Profesor', description: 'Acceso a "Mis Clases" y funcionalidades de profesor.' },
  { id: 'take_attendance', label: 'Tomar Asistencia', description: 'Marcar la asistencia en las clases asignadas.' },
];

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { toast } = useToast();

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        setRoles(await res.json());
      } else {
        console.error("Failed to fetch roles");
        toast({ title: "Error", description: "No se pudieron cargar los roles.", variant: "destructive" });
      }
    } catch (e) {
      console.error("Error fetching roles", e);
      toast({ title: "Error", description: "No se pudieron cargar los roles.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRoles();
  }, [toast]);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', permissions: [] },
  });

  const handleOpenDialog = (role: Role | null = null) => {
    setEditingRole(role);
    if (role) {
      form.reset(role);
    } else {
      form.reset({ name: '', permissions: [] });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: RoleFormValues) => {
    const permissions = data.permissions as Permission[];

    try {
      let response;
      if (editingRole) {
        response = await fetch(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, permissions }),
        });
      } else {
        const roleId = data.name.toLowerCase().replace(/\s+/g, '-');
        response = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: roleId, name: data.name, permissions }),
        });
      }

      if (!response.ok) {
        throw new Error('Error al guardar el rol');
      }

      toast({
        title: `Rol ${editingRole ? 'actualizado' : 'creado'} con éxito`,
        description: `El rol "${data.name}" ha sido guardado.`,
      });

      await fetchRoles();
      setIsDialogOpen(false);
      setEditingRole(null);
    } catch (error) {
      toast({ title: "Error", description: 'Hubo un error al guardar el rol.', variant: 'destructive' });
    }
  };

  const handleDelete = async (roleId: string) => {
    // Prevent deleting core roles in this simulation
    if (['admin', 'teacher', 'student', 'socio', 'administrative'].includes(roleId.toLowerCase())) {
      toast({
        title: "Error al eliminar",
        description: "No se pueden eliminar los roles principales.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast({
        title: "Rol eliminado",
        description: `El rol ha sido eliminado exitosamente.`,
        variant: "destructive"
      });
      await fetchRoles();
    } catch (error) {
      toast({ title: "Error", description: "Hubo un error al intentar eliminar el rol.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-36" />
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
      <div className="mb-4">
        <BackButton href="/admin/users">Volver a Usuarios</BackButton>
      </div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          Gestión de Roles
        </h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Rol
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Roles de Usuario</CardTitle>
          <CardDescription>Define los roles y los permisos de acceso para los usuarios de la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Rol</TableHead>
                  <TableHead className="hidden sm:table-cell">Permisos</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 4).map(p => <Badge key={p} variant="outline">{p.replace(/_/g, ' ')}</Badge>)}
                        {role.permissions.length > 4 && <Badge variant="secondary">+{role.permissions.length - 4} más</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(role)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente el rol.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(role.id)}>Eliminar</AlertDialogAction>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Rol' : 'Añadir Nuevo Rol'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Modifica los detalles y permisos del rol.' : 'Crea un nuevo rol y asígnale permisos.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre del Rol</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField
                control={form.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Permisos</FormLabel>
                      <FormDescription>
                        Selecciona los permisos que tendrá este rol.
                      </FormDescription>
                    </div>
                    <ScrollArea className="h-60 rounded-md border p-4">
                      <div className="space-y-4">
                        {availablePermissions.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item.id])
                                          : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== item.id
                                            )
                                          )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">{item.label}</FormLabel>
                                    <FormDescription>{item.description}</FormDescription>
                                  </div>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
