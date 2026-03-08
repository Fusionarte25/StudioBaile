'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { StudentPayment, User, MembershipPlan, DanceClass } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Download, Edit, Printer, TrendingDown, TrendingUp, Wallet, PlusCircle, ArrowLeft } from 'lucide-react';
import { StudentPaymentsTable } from '@/components/admin/student-payments-table';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/shared/back-button';

const newInvoiceSchema = z.object({
  studentId: z.string().min(1, "Debes seleccionar un alumno."),
  planId: z.string().min(1, "Debes seleccionar un plan."),
});
type NewInvoiceFormValues = z.infer<typeof newInvoiceSchema>;

export default function AdminPaymentsPage() {
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [danceClasses, setDanceClasses] = useState<DanceClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userRole } = useAuth();
  
  const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, plansRes, classesRes, paymentsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/memberships'),
          fetch('/api/classes'),
          fetch('/api/payments'),
        ]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (plansRes.ok) setMembershipPlans(await plansRes.json());
        if (classesRes.ok) setDanceClasses(await classesRes.json());
        if (paymentsRes.ok) setStudentPayments(await paymentsRes.json());
      } catch (error) {
        console.error("Failed to fetch data for payments page", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchData();
  }, [toast]);

  const canCreate = userRole === 'Admin' || userRole === 'Administrativo' || userRole === 'Socio';

  const students = users.filter(u => u.role === 'Estudiante');
  
  const partnerClassIds = useMemo(() => {
    const partners = users.filter(u => u.isPartner);
    const ids = new Set<string>();
    danceClasses.forEach(c => {
      if (c.teacherIds.some(tid => partners.some(p => p.id === tid))) {
        ids.add(c.id);
      }
    });
    return ids;
  }, [users, danceClasses]);

  const studioPayments = useMemo(() => {
    return studentPayments.filter(p => {
      const plan = membershipPlans.find(mp => mp.id === p.planId);
      if (!plan) return true;

      if (plan.accessType === 'time_pass') return true; 

      if (plan.allowedClasses && plan.allowedClasses.length > 0) {
        return plan.allowedClasses.some(classId => !partnerClassIds.has(classId));
      }
      
      if (!plan.allowedClasses || plan.allowedClasses.length === 0) {
        return true;
      }
      
      return false;
    });
  }, [studentPayments, membershipPlans, partnerClassIds]);


  const newInvoiceForm = useForm<NewInvoiceFormValues>({
      resolver: zodResolver(newInvoiceSchema),
  });
  
  const getEditorName = () => userRole ? userRole : 'Sistema';

  const onNewInvoiceSubmit = (data: NewInvoiceFormValues) => {
      const student = users.find(u => u.id === Number(data.studentId));
      const plan = membershipPlans.find(p => p.id === data.planId);

      if (!student || !plan || !plan.id) {
          toast({ title: "Error", description: "Alumno o plan no válido.", variant: "destructive" });
          return;
      }

      if (plan.accessType === 'custom_pack') {
        toast({ title: "Acción no permitida", description: "Los bonos personalizados no pueden ser asignados desde esta pantalla.", variant: "destructive" });
        return;
      }
      
      const totalAmount = 'price' in plan && typeof plan.price === 'number' ? plan.price : 0;

      const newPayment: StudentPayment = {
          id: `inv-${Date.now()}`,
          studentId: student.id,
          planId: plan.id,
          invoiceDate: new Date().toISOString(),
          totalAmount: totalAmount,
          status: 'pending',
          amountPaid: 0,
          amountDue: totalAmount,
          lastUpdatedBy: getEditorName(),
          lastUpdatedDate: new Date().toISOString(),
          notes: '',
      };

      setStudentPayments(prev => [...prev, newPayment]);

      toast({ title: "Factura creada", description: `Se ha creado una factura para ${student.name}.` });
      setIsNewInvoiceOpen(false);
      newInvoiceForm.reset();
  }

  const totals = studioPayments.reduce((acc, p) => {
      acc.collected += p.amountPaid;
      acc.pending += p.amountDue;
      acc.total += p.totalAmount;
      return acc;
  }, { collected: 0, pending: 0, total: 0 });
  
  if (isLoading) {
    return (
        <div className="p-4 md:p-8 space-y-8">
            <Skeleton className="h-12 w-96" />
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <Skeleton className="h-96" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4">
        <BackButton href="/admin/finances">Volver a Finanzas</BackButton>
      </div>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-2 no-print">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Pagos de Alumnos (Estudio)</h1>
        </div>
         {canCreate && (
            <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4"/> Crear Factura</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nueva Factura</DialogTitle>
                        <DialogDescription>Genera una nueva factura para un alumno.</DialogDescription>
                    </DialogHeader>
                    <Form {...newInvoiceForm}>
                        <form onSubmit={newInvoiceForm.handleSubmit(onNewInvoiceSubmit)} className="space-y-4 py-4">
                              <FormField control={newInvoiceForm.control} name="studentId" render={({ field }) => (
                              <FormItem><FormLabel>Alumno</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar alumno..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                </SelectContent>
                              </Select><FormMessage /></FormItem>
                            )} />
                              <FormField control={newInvoiceForm.control} name="planId" render={({ field }) => (
                              <FormItem><FormLabel>Plan de Membresía</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar plan..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {membershipPlans.filter(p => p.id).map(p => (
                                    <SelectItem key={p.id} value={p.id!} disabled={p.accessType === 'custom_pack'}>
                                      {p.title} {p.price ? `(€${p.price})` : '(Bono personalizado)'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select><FormMessage /></FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsNewInvoiceOpen(false)}>Cancelar</Button>
                                <Button type="submit">Crear Factura</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8 no-print">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado (Mes)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totals.collected.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de Cobro (Mes)</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{totals.pending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturación Total (Mes)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totals.total.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <StudentPaymentsTable 
        payments={studioPayments}
        onPaymentsUpdate={setStudentPayments}
        users={users}
        membershipPlans={membershipPlans}
        title="Listado de Pagos (Estudio)"
        description="Gestiona los pagos de membresías no directamente ligadas a clases de socios."
      />
      
    </div>
  );
}
