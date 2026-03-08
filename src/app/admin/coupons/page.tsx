
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { Coupon, MembershipPlan, DanceClass } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, TicketPercent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/shared/back-button';

const couponFormSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3, "El código debe tener al menos 3 caracteres.").toUpperCase(),
  discountType: z.enum(['percentage', 'fixed'], { required_error: "Debes seleccionar un tipo." }),
  discountValue: z.coerce.number().positive("El valor debe ser positivo."),
  expirationDate: z.string().optional(),
  usageLimit: z.coerce.number().int().min(1).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  applicableTo: z.enum(['all_memberships', 'specific_memberships', 'all_classes', 'specific_classes']),
  specificPlanIds: z.array(z.string()).optional(),
  specificClassIds: z.array(z.string()).optional(),
}).refine(data => {
    if (data.applicableTo === 'specific_memberships' && (!data.specificPlanIds || data.specificPlanIds.length === 0)) {
        return false;
    }
    return true;
}, { message: 'Debes seleccionar al menos una membresía.', path: ['specificPlanIds'] })
.refine(data => {
    if (data.applicableTo === 'specific_classes' && (!data.specificClassIds || data.specificClassIds.length === 0)) {
        return false;
    }
    return true;
}, { message: 'Debes seleccionar al menos una clase.', path: ['specificClassIds'] });


type CouponFormValues = z.infer<typeof couponFormSchema>;

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [danceClasses, setDanceClasses] = useState<DanceClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [couponsRes, plansRes, classesRes] = await Promise.all([
            fetch('/api/coupons'),
            fetch('/api/memberships'),
            fetch('/api/classes'),
        ]);
        if (couponsRes.ok) setCoupons(await couponsRes.json());
        if (plansRes.ok) setMembershipPlans(await plansRes.json());
        if (classesRes.ok) setDanceClasses(await classesRes.json());
    } catch (error) {
        console.error("Failed to fetch coupon data", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [toast]);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: '',
      discountType: 'percentage',
      status: 'active',
      applicableTo: 'all_memberships',
      specificPlanIds: [],
      specificClassIds: [],
    },
  });

  const applicableTo = form.watch('applicableTo');
  
  const handleOpenDialog = (coupon: Coupon | null = null) => {
    setEditingCoupon(coupon);
    if (coupon) {
      form.reset({
        ...coupon,
        discountValue: coupon.discountValue || 0,
        expirationDate: coupon.expirationDate ? format(parseISO(coupon.expirationDate), 'yyyy-MM-dd') : undefined,
      });
    } else {
      form.reset({
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        status: 'active',
        applicableTo: 'all_memberships',
        specificPlanIds: [],
        specificClassIds: [],
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CouponFormValues) => {
    const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
    const method = editingCoupon ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Failed to ${method} coupon`);
        }

        toast({
            title: `Cupón ${editingCoupon ? 'actualizado' : 'creado'} con éxito`,
            description: `El cupón "${data.code}" ha sido guardado.`,
        });

        await fetchData(); // Refetch data
    } catch (error) {
        toast({ title: "Error", description: "No se pudo guardar el cupón.", variant: "destructive" });
    } finally {
        setIsDialogOpen(false);
        setEditingCoupon(null);
    }
  };
  
  const handleDelete = async (couponId: string) => {
    try {
        const response = await fetch(`/api/coupons/${couponId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete coupon");

        toast({ title: "Cupón eliminado", variant: "destructive" });
        await fetchData(); // Refetch data
    } catch (error) {
        toast({ title: "Error", description: "No se pudo eliminar el cupón.", variant: "destructive" });
    }
  }

  const getApplicabilityText = (coupon: Coupon) => {
      switch(coupon.applicableTo) {
          case 'all_memberships': return 'Todas las membresías';
          case 'specific_memberships': return `Membresías específicas (${coupon.specificPlanIds?.length || 0})`;
          case 'all_classes': return 'Todas las clases';
          case 'specific_classes': return `Clases específicas (${coupon.specificClassIds?.length || 0})`;
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
        <BackButton href="/admin/memberships">Volver a Membresías</BackButton>
      </div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <TicketPercent className="h-8 w-8 text-primary"/>
            Gestión de Cupones
        </h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Cupón
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado de Cupones</CardTitle>
          <CardDescription>Crea y gestiona los cupones de descuento para tu academia.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead className="hidden md:table-cell">Aplicable a</TableHead>
                  <TableHead className="hidden sm:table-cell">Usos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                    <TableCell>
                        {coupon.discountType === 'fixed' ? `€${coupon.discountValue}` : `${coupon.discountValue}%`}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{getApplicabilityText(coupon)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{coupon.usageLimit || 'Ilimitados'}</TableCell>
                    <TableCell>
                        <Badge variant={coupon.status === 'active' ? 'default' : 'outline'}>{coupon.status === 'active' ? 'Activo' : 'Inactivo'}</Badge>
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(coupon)}>
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
                                      <AlertDialogDescription>Esta acción eliminará el cupón permanentemente.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(coupon.id)}>Eliminar</AlertDialogAction>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar Cupón' : 'Añadir Nuevo Cupón'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Modifica los detalles del cupón.' : 'Rellena los detalles para crear un nuevo cupón.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem><FormLabel>Código del Cupón</FormLabel><FormControl><Input {...field} placeholder="VERANO20" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Estado</FormLabel>
                        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-10">
                            <FormDescription>{field.value === 'active' ? 'El cupón se puede usar.' : 'El cupón está desactivado.'}</FormDescription>
                            <FormControl><Switch checked={field.value === 'active'} onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')} /></FormControl>
                        </div>
                    </FormItem>
                )} />
              </div>
              <div className="p-4 border rounded-md space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="discountType" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de Descuento</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                                <SelectItem value="fixed">Monto Fijo (€)</SelectItem>
                            </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="discountValue" render={({ field }) => (
                        <FormItem><FormLabel>Valor</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
              </div>
              <div className="p-4 border rounded-md space-y-4">
                <FormField control={form.control} name="applicableTo" render={({ field }) => (
                    <FormItem><FormLabel>Aplicable a</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="all_memberships">Todas las membresías</SelectItem>
                            <SelectItem value="specific_memberships">Membresías específicas</SelectItem>
                            <SelectItem value="all_classes">Todas las clases individuales</SelectItem>
                            <SelectItem value="specific_classes">Clases individuales específicas</SelectItem>
                        </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                {applicableTo === 'specific_memberships' && (
                     <FormField
                        control={form.control}
                        name="specificPlanIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seleccionar Membresías</FormLabel>
                            <ScrollArea className="h-40 rounded-md border p-4">
                                {membershipPlans.filter(plan => !!plan.id).map((plan) => (
                                    <FormItem key={plan.id} className="flex flex-row items-start space-x-3 space-y-0 mb-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(plan.id!)}
                                                onCheckedChange={(checked) => {
                                                    const currentIds = field.value || [];
                                                    return checked
                                                        ? field.onChange([...currentIds, plan.id!])
                                                        : field.onChange(currentIds.filter((id) => id !== plan.id));
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">{plan.title}</FormLabel>
                                    </FormItem>
                                ))}
                            </ScrollArea>
                            <FormMessage />
                          </FormItem>
                        )}
                    />
                )}
                 {applicableTo === 'specific_classes' && (
                     <FormField
                        control={form.control}
                        name="specificClassIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seleccionar Clases</FormLabel>
                             <ScrollArea className="h-40 rounded-md border p-4">
                                {danceClasses.map((item) => (
                                    <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0 mb-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(item.id)}
                                                onCheckedChange={(checked) => {
                                                    const currentIds = field.value || [];
                                                    return checked
                                                        ? field.onChange([...currentIds, item.id])
                                                        : field.onChange(currentIds.filter((id) => id !== item.id));
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal text-sm">{item.name} ({item.day} - {item.time})</FormLabel>
                                    </FormItem>
                                ))}
                            </ScrollArea>
                            <FormMessage />
                          </FormItem>
                        )}
                    />
                )}
              </div>
               <div className="p-4 border rounded-md grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="expirationDate" render={({ field }) => (
                        <FormItem><FormLabel>Fecha de Caducidad</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormDescription>Dejar vacío para que no caduque.</FormDescription><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="usageLimit" render={({ field }) => (
                        <FormItem><FormLabel>Límite de Usos</FormLabel><FormControl><Input type="number" min="1" {...field} placeholder="Ej: 100" /></FormControl><FormDescription>Dejar vacío para usos ilimitados.</FormDescription><FormMessage /></FormItem>
                    )} />
                </div>
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

    