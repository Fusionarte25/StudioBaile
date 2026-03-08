
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { DanceStyle } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/shared/back-button';

const styleFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio."),
  description: z.string().min(1, "La descripción es obligatoria."),
});

type StyleFormValues = z.infer<typeof styleFormSchema>;

export default function AdminStylesPage() {
  const [styles, setStyles] = useState<DanceStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<DanceStyle | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchStyles = async () => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/styles');
        if (res.ok) setStyles(await res.json());
    } catch (e) {
        toast({ title: "Error", description: "No se pudieron cargar los estilos." });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, [toast]);

  const form = useForm<StyleFormValues>({
    resolver: zodResolver(styleFormSchema),
    defaultValues: { name: '', description: '' },
  });

  const handleOpenDialog = (style: DanceStyle | null = null) => {
    setEditingStyle(style);
    if (style) {
      form.reset(style);
    } else {
      form.reset({ name: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: StyleFormValues) => {
    const url = editingStyle ? `/api/styles/${editingStyle.id}` : '/api/styles';
    const method = editingStyle ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Failed to ${method} style`);
        }

        toast({
            title: `Estilo ${editingStyle ? 'actualizado' : 'creado'} con éxito`,
            description: `El estilo "${data.name}" ha sido guardado.`,
        });

        await fetchStyles(); // Refetch data
    } catch (error) {
        toast({ title: "Error", description: `No se pudo guardar el estilo. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    } finally {
        setIsDialogOpen(false);
        setEditingStyle(null);
    }
  };
  
  const handleDelete = async (styleId: string) => {
    try {
        const response = await fetch(`/api/styles/${styleId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete style");

        toast({ title: "Estilo eliminado", variant: "destructive" });
        await fetchStyles(); // Refetch data
    } catch (error) {
        toast({ title: "Error", description: "No se pudo eliminar el estilo.", variant: "destructive" });
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4">
        <BackButton href="/admin/classes">Volver a Clases</BackButton>
      </div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Gestión de Estilos de Baile</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Estilos de Baile Ofrecidos</CardTitle>
          <CardDescription>Añade, edita o elimina los estilos de baile de la academia.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Estilo
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Estilo</TableHead>
                  <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {styles.map((style) => (
                  <TableRow key={style.id}>
                    <TableCell className="font-medium">{style.name}</TableCell>
                    <TableCell className="hidden sm:table-cell max-w-sm truncate">{style.description}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(style)}>
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
                                  Esta acción no se puede deshacer. Esto eliminará permanentemente el estilo de baile.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(style.id)}>Eliminar</AlertDialogAction>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStyle ? 'Editar Estilo' : 'Añadir Nuevo Estilo'}</DialogTitle>
            <DialogDescription>
              {editingStyle ? 'Modifica el nombre del estilo.' : 'Añade un nuevo estilo de baile.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre del Estilo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
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
