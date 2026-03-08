
'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, BookCheck, Eye, CheckCircle, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useAttendance } from '@/context/attendance-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { parse, addMinutes, subMinutes, isWithinInterval, isPast, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DanceClass, ClassInstance, User } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const daysOfWeekMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function MyClassesPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { classInstances, generateInstancesForTeacher, confirmClass } = useAttendance();
  const [showAllMonth, setShowAllMonth] = useState(false);
  const [viewingClass, setViewingClass] = useState<ClassInstance | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allClasses, setAllClasses] = useState<DanceClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentUserId = currentUser?.id;

  useEffect(() => {
      const fetchData = async () => {
          setIsLoading(true);
          try {
              const [usersRes, classesRes] = await Promise.all([
                  fetch('/api/users'),
                  fetch('/api/classes')
              ]);
              if(usersRes.ok) setAllUsers(await usersRes.json());
              if(classesRes.ok) setAllClasses(await classesRes.json());
          } catch(e) {
              toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
          } finally {
              setIsLoading(false);
          }
      };
      fetchData();
  }, [toast]);

  useEffect(() => {
    if (currentUserId && !isLoading) {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        generateInstancesForTeacher(currentUserId, start, end, allClasses);
    }
  }, [currentUserId, generateInstancesForTeacher, isLoading, allClasses]);

  const myClassInstancesForMonth = useMemo(() => {
    if (!currentUserId) return [];
    return classInstances.filter(c => c.teacherIds.includes(currentUserId));
  }, [currentUserId, classInstances]);
  
  const completedClassesCount = useMemo(() => {
    return myClassInstancesForMonth.filter(c => c.status === 'completed').length;
  }, [myClassInstancesForMonth]);
  
  const displayedClasses = useMemo(() => {
    const sortedInstances = [...myClassInstancesForMonth].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (showAllMonth) {
        return sortedInstances;
    }
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    return sortedInstances.filter(c => {
        const classDate = parseISO(c.date);
        return isWithinInterval(classDate, { start: startOfThisWeek, end: endOfThisWeek });
    });
  }, [myClassInstancesForMonth, showAllMonth]);

  const enrolledStudentsForViewingClass = useMemo(() => {
      if (!viewingClass) return [];
      return allUsers.filter(u => viewingClass.enrolledStudentIds.includes(u.id));
  }, [viewingClass, allUsers]);
  
  const handleViewStudents = (classInstance: ClassInstance) => {
    setViewingClass(classInstance);
  }
  
  const handleConfirmClass = useCallback((classId: string, date: string) => {
    confirmClass(classId, date);
    toast({
      title: "Clase Confirmada",
      description: "La clase ha sido marcada como impartida.",
    });
  }, [confirmClass, toast]);
  
  const isWithinAttendanceWindow = (date: string, time: string, duration: string): boolean => {
      try {
          const classDateTime = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
          if (isNaN(classDateTime.getTime())) return false;
          const durationInMinutes = parseInt(duration.replace(' min', ''));
          if (isNaN(durationInMinutes)) return false;
          const attendanceStart = subMinutes(classDateTime, 30);
          const attendanceEnd = addMinutes(classDateTime, durationInMinutes + 30);
          return isWithinInterval(new Date(), { start: attendanceStart, end: attendanceEnd });
      } catch (error) {
          console.error("Error calculating attendance window:", error);
          return false;
      }
  };

  const isClassPastTime = (date: string, time: string, duration: string): boolean => {
      try {
          const classDateTime = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
          if (isNaN(classDateTime.getTime())) return false;
          const durationInMinutes = parseInt(duration.replace(' min', ''));
          if (isNaN(durationInMinutes)) return false;
          const classEnd = addMinutes(classDateTime, durationInMinutes);
          return isPast(classEnd);
      } catch(error) {
          console.error("Error calculating if class is past:", error);
          return false;
      }
  };

  if (isLoading || !currentUser) {
    return (
        <div className="p-4 md:p-8 space-y-6">
            <Skeleton className="h-10 w-64" />
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Mis Clases</h1>
      </div>
      
        <div className="grid gap-6 mt-6">
            <Card>
                <CardHeader>
                    <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                        <div>
                            <CardTitle>Listado de Clases</CardTitle>
                            <CardDescription>
                                {showAllMonth ? 'Mostrando todas las clases del mes.' : 'Mostrando las clases de la semana actual.'}
                                 <span className="block mt-1">
                                    Tienes <span className="font-bold text-primary">{myClassInstancesForMonth.length}</span> clases este mes,
                                    has completado <span className="font-bold text-primary">{completedClassesCount}</span>.
                                </span>
                            </CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => setShowAllMonth(prev => !prev)}>
                            {showAllMonth ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
                            {showAllMonth ? 'Ver solo esta semana' : 'Ver todo el mes'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {displayedClasses.length > 0 ? (
                        <ul className="space-y-4">
                            {displayedClasses.map(c => {
                                const canTakeAttendance = isWithinAttendanceWindow(c.date, c.time, c.duration);
                                const hasFinished = isClassPastTime(c.date, c.time, c.duration);
                                const canConfirm = hasFinished && c.status === 'scheduled';
                                const isCompleted = c.status === 'completed';

                                return (
                                    <li key={c.instanceId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                                        <div className="flex-grow">
                                            <p className="font-bold">{c.name} - {c.levelId}</p>
                                            <p className="text-sm text-muted-foreground">{format(parseISO(c.date), "EEEE, dd 'de' MMMM", { locale: es })} a las {c.time} en {c.room}</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Dialog open={viewingClass?.instanceId === c.instanceId} onOpenChange={(isOpen) => !isOpen && setViewingClass(null)}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" onClick={() => handleViewStudents(c)}>
                                                      <Eye className="mr-2 h-4 w-4" /> Ver Inscritos ({c.enrolledStudentIds.length})
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Alumnos Inscritos en "{c.name}"</DialogTitle>
                                                        <DialogDescription>
                                                            Lista de alumnos para la clase del {format(parseISO(c.date), 'PPP', {locale: es})} a las {c.time}.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <ScrollArea className="max-h-80 pr-4">
                                                      <ul className="space-y-4 py-4">
                                                          {enrolledStudentsForViewingClass.length > 0 ? (
                                                              enrolledStudentsForViewingClass.map(student => (
                                                                  <li key={student.id} className="flex items-center gap-4">
                                                                      <Avatar>
                                                                          <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person face" />
                                                                          <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                                      </Avatar>
                                                                      <div>
                                                                          <p className="font-medium">{student.name}</p>
                                                                          <p className="text-sm text-muted-foreground">{student.email}</p>
                                                                      </div>
                                                                  </li>
                                                              ))
                                                          ) : (
                                                            <p className="text-sm text-muted-foreground text-center py-4">No hay alumnos inscritos en esta clase.</p>
                                                          )}
                                                      </ul>
                                                    </ScrollArea>
                                                </DialogContent>
                                            </Dialog>
                                            
                                            {isCompleted ? (
                                                <Button variant="ghost" size="sm" className="text-green-600" disabled><CheckCircle className="mr-2 h-4 w-4" /> Completada</Button>
                                            ) : canConfirm ? (
                                                <Button variant="default" size="sm" onClick={() => handleConfirmClass(c.id, c.date)}><CheckCircle className="mr-2 h-4 w-4" /> Confirmar Clase</Button>
                                            ) : (
                                                <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="w-full">
                                                        <Button variant={canTakeAttendance ? 'default' : 'secondary'} size="sm" onClick={() => router.push(`/my-classes/${c.id}/attendance?date=${c.date}`)} disabled={!canTakeAttendance}>
                                                            <BookCheck className="mr-2 h-4 w-4" /> Pasar Lista
                                                        </Button>
                                                        </div>
                                                    </TooltipTrigger>
                                                    {!canTakeAttendance && (
                                                        <TooltipContent>
                                                            <p>Se habilita 30 min antes y hasta 30 min después de la clase.</p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No tienes ninguna clase asignada en el periodo seleccionado.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
