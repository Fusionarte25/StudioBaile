
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import type { StudentPayment, User, MembershipPlan } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';

const paymentEditSchema = z.object({
  id: z.string(),
  status: z.enum(['paid', 'pending', 'deposit']),
  amountPaid: z.coerce.number().min(0, "El monto no puede ser negativo."),
  notes: z.string().optional(),
});

type PaymentEditFormValues = z.infer<typeof paymentEditSchema>;

interface StudentPaymentsTableProps {
    payments: StudentPayment[];
    onPaymentsUpdate: (payments: StudentPayment[]) => void;
    users: User[];
    membershipPlans: MembershipPlan[];
    title: string;
    description: string;
}

export function StudentPaymentsTable({ payments, onPaymentsUpdate, users, membershipPlans, title, description }: StudentPaymentsTableProps) {
  const { userRole } = useAuth();
  const [editingPayment, setEditingPayment] = useState<StudentPayment | null>(null);
  const { toast } = useToast();
  
  const canEdit = userRole === 'Admin' || userRole === 'Administrativo' || userRole === 'Socio';

  const editForm = useForm<PaymentEditFormValues>({
    resolver: zodResolver(paymentEditSchema),
  });

  const watchedStatus = editForm.watch('status');

  useEffect(() => {
    if (watchedStatus === 'paid' && editingPayment) {
      editForm.setValue('amountPaid', editingPayment.totalAmount, { shouldValidate: true });
    }
  }, [watchedStatus, editingPayment, editForm]);
  
  const getStudentName = (id: number) => users.find(u => u.id === id)?.name || 'Desconocido';
  const getPlanName = (id: string) => membershipPlans.find(p => p.id === id)?.title || 'Desconocido';

  const handleOpenEditDialog = (payment: StudentPayment) => {
    setEditingPayment(payment);
    editForm.reset({
      id: payment.id,
      status: payment.status,
      amountPaid: payment.amountPaid,
      notes: payment.notes || '',
    });
  };
  
  const onEditSubmit = async (data: PaymentEditFormValues) => {
    if (!editingPayment) return;
    
    try {
        const response = await fetch(`/api/payments/${editingPayment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update payment');
        }

        const updatedPayment = await response.json();
        
        onPaymentsUpdate(
            payments.map(p => p.id === updatedPayment.id ? updatedPayment : p)
        );

        toast({ title: "Pago actualizado", description: "El estado del pago ha sido guardado." });
        setEditingPayment(null);
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead className="hidden sm:table-cell">Plan</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Notas</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Pendiente</TableHead>
                <TableHead className="no-print">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                      <p className="font-medium">{getStudentName(p.studentId)}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(p.invoiceDate), 'dd/MM/yyyy')}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{getPlanName(p.planId)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={p.status === 'paid' ? 'default' : p.status === 'pending' ? 'destructive' : 'secondary'}>
                      {{
                        paid: 'Pagado',
                        pending: 'Pendiente',
                        deposit: 'Adelanto'
                      }[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-xs truncate">{p.notes}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right font-mono text-red-600">€{p.amountDue.toFixed(2)}</TableCell>
                  <TableCell className="no-print">
                    {canEdit && (
                        <Dialog open={editingPayment?.id === p.id} onOpenChange={(isOpen) => !isOpen && setEditingPayment(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(p)}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>Editar Estado de Pago</DialogTitle>
                                  <DialogDescription>
                                      Actualiza el estado del pago para {getStudentName(p.studentId)}.
                                  </DialogDescription>
                              </DialogHeader>
                              <Form {...editForm}>
                                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                                       <FormField control={editForm.control} name="status" render={({ field }) => (
                                        <FormItem><FormLabel>Estado del Pago</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                          <SelectContent>
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                            <SelectItem value="deposit">Adelanto</SelectItem>
                                            <SelectItem value="paid">Pagado</SelectItem>
                                          </SelectContent>
                                        </Select><FormMessage /></FormItem>
                                      )} />
                                       <FormField control={editForm.control} name="amountPaid" render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Monto Pagado (€)</FormLabel>
                                              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )} />
                                      <FormField control={editForm.control} name="notes" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notas</FormLabel>
                                            <FormControl><Textarea placeholder="Añade un comentario..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                      )} />
                                      <DialogFooter>
                                          <Button type="button" variant="ghost" onClick={() => setEditingPayment(null)}>Cancelar</Button>
                                          <Button type="submit">Guardar</Button>
                                      </DialogFooter>
                                  </form>
                              </Form>
                          </DialogContent>
                        </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
               {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    No hay pagos de alumnos para mostrar en esta vista.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
