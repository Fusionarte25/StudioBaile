
'use client';

import { useState, useEffect } from 'react';
import { useAttendance } from '@/context/attendance-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Calendar, Check, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/context/auth-context';
import type { DanceClass, User } from '@/lib/types';

type AttendanceSheetProps = {
  classId: string;
  date: string; // YYYY-MM-DD
  userRole: UserRole | null;
};

export function AttendanceSheet({ classId, date, userRole }: AttendanceSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { recordAttendance, getAttendanceForClass } = useAttendance();
  const [danceClass, setDanceClass] = useState<DanceClass | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [classRes, usersRes] = await Promise.all([
                fetch('/api/classes'), // Inefficient, should be /api/classes/[id] if it existed
                fetch('/api/users')
            ]);
            if (classRes.ok && usersRes.ok) {
                const allClasses: DanceClass[] = await classRes.json();
                const allUsers: User[] = await usersRes.json();
                const targetClass = allClasses.find(c => c.id === classId);
                if(targetClass) {
                    setDanceClass(targetClass);
                    setEnrolledStudents(allUsers.filter(u => targetClass.enrolledStudentIds.includes(u.id)));
                }
            }
        } catch(e) {
            toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [classId, toast]);

  const initialAttendance = getAttendanceForClass(classId, date);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});

  useEffect(() => {
      if (initialAttendance && initialAttendance.studentStatus) {
         setAttendance(Object.fromEntries(initialAttendance.studentStatus.map(s => [s.studentId, s.present])));
      } else {
         setAttendance(enrolledStudents.reduce((acc, student) => ({ ...acc, [student.id]: true }), {}));
      }
  }, [initialAttendance, enrolledStudents]);

  if (isLoading) {
      return <div>Cargando...</div>
  }

  if (!danceClass) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Clase no encontrada</h1>
        <p className="text-muted-foreground">No se pudo encontrar la clase que estás buscando.</p>
        <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const handleAttendanceChange = (studentId: number, isPresent: boolean) => {
    setAttendance((prev) => ({ ...prev, [studentId]: isPresent }));
  };

  const handleSaveAttendance = () => {
    const studentStatus = Object.entries(attendance).map(([studentId, present]) => ({
      studentId: Number(studentId),
      present,
    }));
    
    recordAttendance(classId, date, studentStatus);

    toast({
      title: 'Asistencia Guardada',
      description: `La asistencia para la clase del ${format(parseISO(date), 'PPP', {locale: es})} ha sido guardada.`,
    });
    router.back();
  };
  
  const backUrl = userRole === 'Admin' ? '/admin/classes' : '/my-classes';

  return (
    <div className="p-4 md:p-8">
      <Button variant="ghost" onClick={() => router.push(backUrl)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al listado
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">{danceClass.name}</CardTitle>
          <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(parseISO(date), 'EEEE, d \'de\' MMMM', {locale: es})}
            </span>
             <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {danceClass.time}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Marca la casilla para los alumnos que asistieron.
          </p>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Presente</TableHead>
                  <TableHead>Nombre del Alumno</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Checkbox
                        checked={attendance[student.id] ?? true}
                        onCheckedChange={(checked) => handleAttendanceChange(student.id, !!checked)}
                        aria-label={`Marcar asistencia para ${student.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{student.email}</TableCell>
                  </TableRow>
                ))}
                 {enrolledStudents.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay alumnos inscritos.</TableCell></TableRow>
                 )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveAttendance}>
                <Check className="mr-2 h-4 w-4" />
                Guardar Asistencia
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
