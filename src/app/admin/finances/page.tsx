
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { User, DanceClass, Transaction, StudentPayment, MembershipPlan } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { TrendingUp, TrendingDown, Scale, Users, Handshake, Briefcase } from 'lucide-react';
import { TeacherPayroll } from '@/components/admin/teacher-payroll';
import { IncomeExpenseLedger } from '@/components/admin/income-expense-ledger';

export default function FinancesPage() {
  const { userRole, userId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [danceClasses, setDanceClasses] = useState<DanceClass[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, classesRes, transRes, paymentsRes, plansRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/classes'),
          fetch('/api/transactions'),
          fetch('/api/payments'),
          fetch('/api/memberships'),
        ]);

        if (usersRes.ok) setUsers(await usersRes.json());
        if (classesRes.ok) setDanceClasses(await classesRes.json());
        if (transRes.ok) setTransactions(await transRes.json());
        if (paymentsRes.ok) setStudentPayments(await paymentsRes.json());
        if (plansRes.ok) setMembershipPlans(await plansRes.json());

      } catch (error) {
        console.error("Error fetching finance data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const partners = useMemo(() => users.filter(u => u.isPartner), [users]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');

  useEffect(() => {
    if (partners.length > 0 && !selectedPartnerId) {
      setSelectedPartnerId(String(partners[0].id));
    }
  }, [partners, selectedPartnerId]);

  
  const totals = useMemo(() => {
    const studentIncome = studentPayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amountPaid, 0);
    const otherIncome = transactions.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + t.amount, 0);
    const rentalIncome = danceClasses.filter(c => c.type === 'rental' && c.rentalPrice).reduce((acc, c) => acc + (c.rentalPrice || 0), 0);
    const totalIncome = studentIncome + otherIncome + rentalIncome;

    const totalExpenses = transactions.filter(t => t.type === 'egreso').reduce((acc, t) => acc + t.amount, 0);
    const netBalance = totalIncome - totalExpenses;
    
    return { totalIncome, totalExpenses, netBalance };
  }, [studentPayments, danceClasses, transactions]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center"><Skeleton className="h-10 w-48" /><Skeleton className="h-10 w-32" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Gestión Financiera</h1>
          <p className="text-muted-foreground">Resumen de ingresos, gastos y nóminas del estudio.</p>
        </div>
      </div>

      {(userRole === 'Admin' || (userRole === 'Socio' && !userId)) ? (
         <Tabs defaultValue="studio" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:w-fit">
                <TabsTrigger value="studio">Finanzas del Estudio</TabsTrigger>
                <TabsTrigger value="partners">Finanzas de Socios</TabsTrigger>
            </TabsList>
            <TabsContent value="studio" className="mt-6 space-y-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales (Estudio)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-600">€{totals.totalIncome.toFixed(2)}</div><p className="text-xs text-muted-foreground">Membresías, alquileres y otros</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Egresos Operativos</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-red-600">€{totals.totalExpenses.toFixed(2)}</div><p className="text-xs text-muted-foreground">Gastos, suministros, etc.</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance Neto (Estudio)</CardTitle><Scale className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className={`text-2xl font-bold ${totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>€{totals.netBalance.toFixed(2)}</div><p className="text-xs text-muted-foreground">Ingresos - Egresos</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Nóminas (No Socios)</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className="text-2xl font-bold">Ver Desglose</div><p className="text-xs text-muted-foreground">Pagos a profesores</p></CardContent>
                    </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Pagos de Alumnos (Estudio)</CardTitle>
                            <CardDescription>Gestiona facturas y pagos de membresías no asociadas a socios.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Revisa facturas pendientes, registra pagos y crea nuevas facturas para los estudiantes de la academia.</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild>
                                <Link href="/admin/payments">Gestionar Pagos</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle>Libro de Transacciones (General)</CardTitle>
                          <CardDescription>Otros ingresos y egresos operativos.</CardDescription>
                        </CardHeader>
                        <CardContent><IncomeExpenseLedger transactions={transactions || []} /></CardContent>
                    </Card>
                    <div className="lg:col-span-3">
                        <TeacherPayroll 
                            mode="studio_expenses" 
                            users={users || []} 
                            danceClasses={danceClasses || []} 
                            membershipPlans={membershipPlans || []} 
                            studentPayments={studentPayments || []} 
                            onPaymentsUpdate={setStudentPayments}
                        />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="partners" className="mt-6 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 font-headline"><Handshake className="h-6 w-6"/> Finanzas de Socios</CardTitle>
                                <CardDescription>Selecciona un socio para ver el desglose de sus ingresos generados.</CardDescription>
                            </div>
                            <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                                <SelectTrigger className="w-full md:w-[250px]"><SelectValue placeholder="Seleccionar socio..." /></SelectTrigger>
                                <SelectContent>
                                    {partners.map(p => (<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {selectedPartnerId && (
                            <TeacherPayroll 
                                mode="partner_income" 
                                partnerId={parseInt(selectedPartnerId, 10)} 
                                users={users || []} 
                                danceClasses={danceClasses || []} 
                                membershipPlans={membershipPlans || []} 
                                studentPayments={studentPayments || []} 
                                onPaymentsUpdate={setStudentPayments}
                            />
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
         </Tabs>
      ) : userRole === 'Administrativo' ? (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Pagos de Alumnos</CardTitle>
                        <CardDescription>Gestiona las facturas y los pagos de las membresías.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Revisa facturas pendientes, registra pagos y crea nuevas facturas para los estudiantes.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/admin/payments">Gestionar Pagos de Alumnos</Link>
                        </Button>
                    </CardFooter>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Libro de Transacciones (General)</CardTitle>
                      <CardDescription>Otros ingresos y egresos operativos.</CardDescription>
                    </CardHeader>
                    <CardContent><IncomeExpenseLedger transactions={transactions || []} /></CardContent>
                </Card>
            </div>
        </div>
      ) : userRole === 'Socio' ? (
        <Tabs defaultValue="studio" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:w-fit">
                <TabsTrigger value="studio">Finanzas del Estudio</TabsTrigger>
                <TabsTrigger value="personal">Mis Finanzas</TabsTrigger>
            </TabsList>
            <TabsContent value="studio" className="mt-6 space-y-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales (Estudio)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-600">€{totals.totalIncome.toFixed(2)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Egresos Operativos</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-red-600">€{totals.totalExpenses.toFixed(2)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Balance Neto (Estudio)</CardTitle><Scale className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className={`text-2xl font-bold ${totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>€{totals.netBalance.toFixed(2)}</div></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Nóminas (No Socios)</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className="text-2xl font-bold">Ver Desglose</div></CardContent>
                    </Card>
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                             <CardTitle>Libro de Transacciones del Estudio</CardTitle>
                        </CardHeader>
                        <CardContent><IncomeExpenseLedger transactions={transactions || []} /></CardContent>
                    </Card>
                    <TeacherPayroll 
                        mode="studio_expenses" 
                        users={users || []} 
                        danceClasses={danceClasses || []} 
                        membershipPlans={membershipPlans || []} 
                        studentPayments={studentPayments || []} 
                        onPaymentsUpdate={setStudentPayments}
                    />
                </div>
            </TabsContent>
            <TabsContent value="personal" className="mt-6 space-y-8">
                {userId && (
                  <TeacherPayroll 
                      mode="partner_income" 
                      partnerId={userId} 
                      users={users || []} 
                      danceClasses={danceClasses || []} 
                      membershipPlans={membershipPlans || []} 
                      studentPayments={studentPayments || []} 
                      onPaymentsUpdate={setStudentPayments}
                  />
                )}
            </TabsContent>
        </Tabs>
      ) : (
        <Card className="p-8 text-center">
          <CardTitle>Acceso restringido</CardTitle>
          <CardDescription>No tienes permisos suficientes para ver esta sección.</CardDescription>
        </Card>
      )}
    </div>
  );
}
