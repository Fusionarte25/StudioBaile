
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, CheckCircle2, DollarSign, Handshake, MinusCircle, Percent, Users, XCircle, Shield, FileText, UserCheck, Briefcase, User as UserIcon, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAttendance } from '@/context/attendance-context';
import { format, parseISO, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ClassInstance, StudentPayment, DanceClass, User, MembershipPlan } from '@/lib/types';
import { StudentPaymentsTable } from './student-payments-table';
import { Skeleton } from '@/components/ui/skeleton';


const getStatusInfo = (status: string): { text: string; icon: React.ReactNode; color: string } => {
    switch (status) {
        case 'completed': return { text: 'Completada', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600' };
        case 'scheduled': return { text: 'Programada', icon: <AlertCircle className="h-4 w-4" />, color: 'text-blue-600' };
        case 'cancelled-low-attendance': return { text: 'Cancelada (pocos alumnos)', icon: <XCircle className="h-4 w-4" />, color: 'text-yellow-600' };
        case 'cancelled-teacher': return { text: 'Cancelada (profesor)', icon: <MinusCircle className="h-4 w-4" />, color: 'text-red-600' };
        default: return { text: 'Desconocido', icon: <AlertCircle className="h-4 w-4" />, color: 'text-gray-600' };
    }
}
  
type PayrollClassInfo = {
    classTemplate: DanceClass;
    instances: ClassInstance[];
    totalPay: number;
    payDescription: string;
}

type TeacherPayrollProps = {
    mode: 'studio_expenses' | 'partner_income' | 'teacher_income';
    partnerId?: number | null; // For partner income
    teacherId?: number | null; // For individual teacher income
};

export const TeacherPayroll = React.memo(function TeacherPayroll({ mode, partnerId, teacherId }: TeacherPayrollProps) {
    const { generateInstancesForTeacher, classInstances } = useAttendance();
    const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);

    const [users, setUsers] = useState<User[]>([]);
    const [danceClasses, setDanceClasses] = useState<DanceClass[]>([]);
    const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, classesRes, plansRes, paymentsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/classes'),
          fetch('/api/memberships'),
          fetch('/api/payments'),
        ]);

        if (usersRes.ok) setUsers(await usersRes.json());
        if (classesRes.ok) setDanceClasses(await classesRes.json());
        if (plansRes.ok) setMembershipPlans(await plansRes.json());
        if (paymentsRes.ok) setStudentPayments(await paymentsRes.json());
        
      } catch (error) {
        console.error("Error fetching payroll data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Generate instances for all relevant teachers when the component mounts
    useEffect(() => {
        if (isLoading) return;
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);

        if (mode === 'studio_expenses') {
            const nonPartnerTeachers = users.filter(u => u.role === 'Profesor' && !u.isPartner);
            nonPartnerTeachers.forEach(teacher => generateInstancesForTeacher(teacher.id, start, end, danceClasses));
        } else if (mode === 'partner_income' && partnerId) {
            generateInstancesForTeacher(partnerId, start, end, danceClasses);
        } else if (mode === 'teacher_income' && teacherId) {
            generateInstancesForTeacher(teacherId, start, end, danceClasses);
        }
    }, [mode, partnerId, teacherId, generateInstancesForTeacher, users, danceClasses, isLoading]);

    const calculation = useMemo(() => {
        if (isLoading) return null;

        const getStudentPaymentData = (studentIds: Set<number>) => {
            return Array.from(studentIds).map(id => {
                const student = users.find(u => u.id === id);
                return studentPayments.find(p => p.studentId === student?.id);
            }).filter((p): p is StudentPayment => !!p);
        };
        
        const calculateForTeacher = (teacherId: number) => {
            const teacher = users.find(u => u.id === teacherId);
            if (!teacher) return null;

            const classesTaughtInstances = classInstances.filter(c => c.teacherIds.includes(teacher.id));
            let totalIncome = 0;
            const paymentDetails = teacher.paymentDetailsJson;
            
            const incomeDetailsByClassId: Record<string, PayrollClassInfo> = {};

            classesTaughtInstances.forEach(instance => {
                const classTemplate = danceClasses.find(dc => dc.id === instance.id);
                if (!classTemplate) return;

                let classPay = 0;
                let payDescription = '';
                const numTeachers = instance.teacherIds.length || 1;
                
                if (paymentDetails) {
                     if (instance.status === 'completed') {
                        if (instance.type === 'workshop') {
                            if (instance.workshopPaymentType === 'fixed') {
                                classPay = (instance.workshopPaymentValue || 0) / numTeachers;
                                payDescription = `Tarifa fija dividida`;
                            } else { // percentage
                                payDescription = `Porcentaje (${instance.workshopPaymentValue}%)`;
                            }
                        } else if (paymentDetails.type === 'per_class') {
                            const durationHours = parseInt(instance.duration.replace(' min', '')) / 60;
                            classPay = (durationHours * (paymentDetails.payRate || 0)) / numTeachers;
                            payDescription = `${durationHours}h a €${paymentDetails.payRate}/h`;
                        }
                     } else if (instance.status === 'cancelled-low-attendance') {
                         classPay = (paymentDetails.cancelledClassPay || 0) / numTeachers;
                         payDescription = `Compensación por cancelación`;
                     }
                }
                
                if (numTeachers > 1) {
                   payDescription += ` (entre ${numTeachers})`;
                }
                
                totalIncome += classPay;
                
                if (!incomeDetailsByClassId[instance.id]) {
                     incomeDetailsByClassId[instance.id] = {
                        classTemplate: classTemplate,
                        instances: [],
                        totalPay: 0,
                        payDescription: ''
                     };
                }
                incomeDetailsByClassId[instance.id].instances.push(instance);
                incomeDetailsByClassId[instance.id].totalPay += classPay;
                incomeDetailsByClassId[instance.id].payDescription = payDescription; // Assuming it's the same for all instances of a class template
            });

            if (paymentDetails?.type === 'monthly') {
                totalIncome = paymentDetails.monthlySalary || 0;
            }
            
            const groupedClasses = Object.values(incomeDetailsByClassId);
            const individualClasses = groupedClasses.filter(c => c.classTemplate.teacherIds.length === 1);
            
            const sharedClassesByPartner: { [partnerName: string]: PayrollClassInfo[] } = {};
            groupedClasses.filter(c => c.classTemplate.teacherIds.length > 1).forEach(classInfo => {
                const partnerIds = classInfo.classTemplate.teacherIds.filter(id => id !== teacher.id);
                partnerIds.forEach(pId => {
                    const partnerUser = users.find(u => u.id === pId);
                    if (partnerUser) {
                        if (!sharedClassesByPartner[partnerUser.name]) sharedClassesByPartner[partnerUser.name] = [];
                        sharedClassesByPartner[partnerUser.name].push(classInfo);
                    }
                });
            });

            const getPaymentsForGroup = (classGroup: PayrollClassInfo[]) => {
                const studentIds = new Set<number>();
                classGroup.forEach(c => c.instances.forEach(i => i.enrolledStudentIds.forEach(id => studentIds.add(id))));
                return getStudentPaymentData(studentIds);
            };

            const individualStudentsPayments = getPaymentsForGroup(individualClasses);
            
            const sharedStudentsPaymentsByPartner: { [partnerName: string]: StudentPayment[] } = {};
            Object.keys(sharedClassesByPartner).forEach(partnerName => {
                sharedStudentsPaymentsByPartner[partnerName] = getPaymentsForGroup(sharedClassesByPartner[partnerName]);
            });

            return { teacher, totalIncome, individualClasses, individualStudentsPayments, sharedClassesByPartner, sharedStudentsPaymentsByPartner };
        }

        if (mode === 'studio_expenses') {
             const nonPartnerTeachers = users.filter(u => u.role === 'Profesor' && !u.isPartner);
             const payroll = nonPartnerTeachers.map(user => {
                 const calc = calculateForTeacher(user.id);
                 return { user, classes: calc?.individualClasses.concat(Object.values(calc?.sharedClassesByPartner || {}).flat()) || [], totalPay: calc?.totalIncome || 0 };
             });
             return { payroll };
        }

        if ((mode === 'partner_income' && partnerId) || (mode === 'teacher_income' && teacherId)) {
            const currentTeacherId = partnerId || teacherId;
            return calculateForTeacher(currentTeacherId!);
        }

        return null;

    }, [mode, partnerId, teacherId, classInstances, studentPayments, isLoading, users, danceClasses]);
    
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const StudioExpensesView = () => {
        if (!calculation || !('payroll' in calculation)) return null;
        const { payroll } = calculation;

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase /> Nómina de Profesores (No Socios)</CardTitle>
                    <CardDescription>Pagos a realizar a profesores que no son socios del estudio. Esto se considera un egreso.</CardDescription>
                </CardHeader>
                 <CardContent>
                     <Accordion type="single" collapsible className="w-full">
                        {payroll.map(({ user, classes, totalPay }) => (
                            <AccordionItem value={user.name} key={user.id}>
                                <AccordionTrigger>
                                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full pr-4 gap-2">
                                        <div className="flex items-center gap-4">
                                            <Avatar><AvatarImage src={user.avatar} alt={user.name} /><AvatarFallback>{user.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback></Avatar>
                                            <div><p className="font-medium">{user.name}</p></div>
                                        </div>
                                        <div className="text-left sm:text-right w-full sm:w-auto">
                                            <p className="text-lg font-bold text-red-600">€{totalPay.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">Pago total del mes</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Clase</TableHead><TableHead>Instancias</TableHead><TableHead className="text-right">Pago Total</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                        {classes.map((c: any) => (
                                            <TableRow key={c.classTemplate.id}><TableCell>{c.classTemplate.name}</TableCell><TableCell>{c.instances.length}</TableCell><TableCell className="text-right font-mono">€{c.totalPay.toFixed(2)}</TableCell></TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                 </CardContent>
            </Card>
        )
    };
    
    const IncomeView = () => {
        if (!calculation || !('teacher' in calculation) || !calculation.teacher) return null;
        const { teacher, totalIncome, individualClasses, individualStudentsPayments, sharedClassesByPartner, sharedStudentsPaymentsByPartner } = calculation;
        
        return (
            <Tabs defaultValue="total" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                    <TabsTrigger value="total">Resumen de Ingresos</TabsTrigger>
                    <TabsTrigger value="individual">Clases Individuales</TabsTrigger>
                    <TabsTrigger value="shared">Clases Compartidas</TabsTrigger>
                </TabsList>
                <TabsContent value="total" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><DollarSign /> Resumen de Ingresos Mensuales</CardTitle>
                            <CardDescription>
                                Desglose de los ingresos generados por las clases y talleres impartidos este mes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 rounded-lg bg-muted/50 mb-6">
                                <p className="text-sm text-muted-foreground">Ingreso Total Estimado (este mes)</p>
                                <p className="text-3xl font-bold text-primary">€{totalIncome.toFixed(2)}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                                <Card>
                                    <CardHeader><CardTitle className="text-lg flex items-center justify-center gap-2"><UserIcon/>Individual</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold">€{individualClasses.reduce((acc, c) => acc + c.totalPay, 0).toFixed(2)}</p></CardContent>
                                </Card>
                                <Card>
                                     <CardHeader><CardTitle className="text-lg flex items-center justify-center gap-2"><Users/>Compartido</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold">€{Object.values(sharedClassesByPartner).flat().reduce((acc, c) => acc + c.totalPay, 0).toFixed(2)}</p></CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="individual" className="mt-6 space-y-6">
                     <StudentPaymentsTable 
                        payments={individualStudentsPayments} 
                        onPaymentsUpdate={setStudentPayments}
                        users={users} 
                        membershipPlans={membershipPlans} 
                        title="Pagos de Alumnos (Clases Individuales)" 
                        description="Gestiona los pagos de los alumnos inscritos únicamente en tus clases individuales."
                     />

                     <Card>
                        <CardHeader>
                            <CardTitle>Listado de Clases Individuales</CardTitle>
                            <CardDescription>Ingresos de clases impartidas en solitario.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Clase</TableHead><TableHead>Instancias</TableHead><TableHead className="text-right">Ingreso</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {individualClasses?.map((c: PayrollClassInfo) => {
                                        return (
                                            <TableRow key={c.classTemplate.id}>
                                                <TableCell><p className="font-medium">{c.classTemplate.name}</p><p className="text-xs text-muted-foreground capitalize">{c.classTemplate.day} {c.classTemplate.time}</p></TableCell>
                                                <TableCell>{c.instances.length}</TableCell>
                                                <TableCell className="text-right"><p className="font-mono font-semibold">€{c.totalPay.toFixed(2)}</p><p className="text-xs text-muted-foreground">{c.payDescription}</p></TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    {individualClasses.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">No hay clases individuales este mes.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="shared" className="mt-6">
                     {Object.keys(sharedClassesByPartner).length > 0 ? (
                        <Tabs defaultValue={Object.keys(sharedClassesByPartner)[0]} className="w-full">
                            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                {Object.keys(sharedClassesByPartner).map(partnerName => (
                                    <TabsTrigger key={partnerName} value={partnerName}>
                                        Con {partnerName}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {Object.entries(sharedClassesByPartner).map(([partnerName, classes]) => (
                                <TabsContent key={partnerName} value={partnerName} className="mt-4 space-y-6">
                                    <StudentPaymentsTable 
                                        payments={sharedStudentsPaymentsByPartner[partnerName] || []}
                                        onPaymentsUpdate={setStudentPayments}
                                        users={users}
                                        membershipPlans={membershipPlans}
                                        title={`Pagos de Alumnos (Clases con ${partnerName})`}
                                        description="Gestiona los pagos de los alumnos inscritos en estas clases compartidas."
                                    />
                                    
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Desglose de Clases con {partnerName}</CardTitle>
                                            <CardDescription>Total generado en estas clases: €{classes.reduce((acc: any, c: any) => acc + c.totalPay, 0).toFixed(2)}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Clase</TableHead><TableHead>Instancias</TableHead><TableHead className="text-right">Mi Ingreso</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {(classes as any[]).map((c: any) => (
                                                        <TableRow key={c.classTemplate.id}>
                                                            <TableCell><p className="font-medium">{c.classTemplate.name}</p><p className="text-xs text-muted-foreground capitalize">{c.classTemplate.day} {c.classTemplate.time}</p></TableCell>
                                                            <TableCell>{c.instances.length}</TableCell>
                                                            <TableCell className="text-right"><p className="font-mono font-semibold">€{c.totalPay.toFixed(2)}</p><p className="text-xs text-muted-foreground">{c.payDescription}</p></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            ))}
                        </Tabs>
                     ) : (
                        <Card className="mt-4"><CardContent className="text-center text-muted-foreground py-8">No hay clases compartidas este mes.</CardContent></Card>
                     )}
                </TabsContent>
            </Tabs>
        )
    };

    if (mode === 'studio_expenses') return <StudioExpensesView />;
    if (mode === 'partner_income') return <IncomeView />;
    if (mode === 'teacher_income') return <IncomeView />;

    return null;
});
