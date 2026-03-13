
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
import { TrendingUp, TrendingDown, Scale, Users, Handshake, Briefcase, RefreshCw } from 'lucide-react';
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
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/consolidated-data');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
        setDanceClasses(Array.isArray(data.danceClasses) ? data.danceClasses : []);
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        setStudentPayments(Array.isArray(data.studentPayments) ? data.studentPayments : []);
        setMembershipPlans(Array.isArray(data.membershipPlans) ? data.membershipPlans : []);
      }
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const partners = useMemo(() => users.filter(u => u.isPartner || u.role === 'Socio'), [users]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');

  useEffect(() => {
    if (partners.length > 0 && !selectedPartnerId) {
      setSelectedPartnerId(String(partners[0].id));
    }
  }, [partners, selectedPartnerId]);

  
  const totals = useMemo(() => {
    // Total income: All money received from students + other income transactions + rental income
    const studentIncome = studentPayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
    const otherIncome = transactions.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + (t.amount || 0), 0);
    
    // Some rental classes might have prices recorded directly
    const rentalIncome = danceClasses
      .filter(c => c.type === 'rental' && c.rentalPrice)
      .reduce((acc, c) => acc + (c.rentalPrice || 0), 0);
      
    const totalIncome = studentIncome + otherIncome + rentalIncome;

    // Total expenses: All expense transactions
    const totalExpenses = transactions
      .filter(t => t.type === 'egreso')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
      
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
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // If user is neither Admin, Socio, nor Administrative, they shouldn't be here
  if (userRole !== 'Admin' && userRole !== 'Socio' && userRole !== 'Administrativo') {
    return (
      <div className="p-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>No tienes permisos para acceder a esta sección.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
             <Button asChild><Link href="/profile">Volver a mi perfil</Link></Button>
          </CardFooter>
        </Card>
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
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar Datos
        </Button>
      </div>

      <Tabs defaultValue="studio" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 lg:w-fit">
          <TabsTrigger value="studio">Finanzas del Estudio</TabsTrigger>
          {(userRole === 'Admin' || userRole === 'Socio') && <TabsTrigger value="partners">Finanzas de Socios</TabsTrigger>}
          {userRole === 'Socio' && <TabsTrigger value="personal">Mis Finanzas</TabsTrigger>}
        </TabsList>

        <TabsContent value="studio" className="mt-6 space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">€{totals.totalIncome.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Membresías, alquileres e ingresos operacionales.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos Operativos</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">€{totals.totalExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Suministros, otros egresos operacionales.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
                <Scale className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{totals.netBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Diferencia entre ingresos y gastos operativos.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado de Nóminas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Ver abajo</div>
                <p className="text-xs text-muted-foreground">Detalle de pagos a profesores no socios.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Pagos de Alumnos</CardTitle>
                <CardDescription>Gestión de facturas y cobros de membresías.</CardDescription>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground mb-4">
                  Accede al panel completo de pagos para registrar nuevos cobros o emitir facturas.
                 </p>
                 <Button asChild className="w-full">
                    <Link href="/admin/payments">Ir a Pagos de Alumnos</Link>
                 </Button>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Libro de Transacciones</CardTitle>
                <CardDescription>Registro de otros ingresos y gastos.</CardDescription>
              </CardHeader>
              <CardContent>
                <IncomeExpenseLedger transactions={transactions || []} />
              </CardContent>
            </Card>
            
            {userRole !== 'Administrativo' && (
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
            )}
          </div>
        </TabsContent>

        <TabsContent value="partners" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 font-headline"><Handshake className="h-6 w-6"/> Nóminas y Finanzas de Socios</CardTitle>
                  <CardDescription>Cálculo de ingresos generados por los socios del estudio.</CardDescription>
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
    </div>
  );
}
