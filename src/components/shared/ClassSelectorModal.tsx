
'use client';
import { useState, useMemo, useEffect, memo } from 'react';
import type { MembershipPlan, DanceClass, User } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, getDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isBefore, isAfter, isWithinInterval, add } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type SelectedClass = {
    classId: string;
    date: string; // YYYY-MM-DD format
};

type ClassSelectorModalProps = {
    plan: MembershipPlan;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (classIds: string[]) => void;
    overrideClassCount?: number;
};

const daysOfWeekMap = [
    "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

const DayContent = memo(function DayContent({ date, displayMonth, isSelected, onClick, classesOnDay }: { date: Date, displayMonth?: Date, isSelected: boolean, onClick: (date: Date) => void, classesOnDay: DanceClass[] }) {
    const dateStr = format(date, 'd');
    const isCurrentDisplayMonth = displayMonth && displayMonth.getMonth() === date.getMonth();

    if (!isCurrentDisplayMonth) {
        return <div className="p-2 h-24 flex items-start"><time dateTime={dateStr} className="text-muted-foreground/50">{format(date, 'd')}</time></div>;
    }

    return (
        <button 
            className={cn("p-2 h-24 w-full flex flex-col items-start cursor-pointer transition-colors relative text-left", isSelected && 'bg-primary/10', 'hover:bg-muted/50')}
            onClick={() => onClick(date)}
            disabled={classesOnDay.length === 0}
        >
            <time dateTime={dateStr} className={cn("font-semibold", isSelected && "text-primary")}>{format(date, 'd')}</time>
            {classesOnDay.length > 0 && (
                <div className="mt-auto">
                    <Badge variant={isSelected ? "default" : "secondary"}>
                        {classesOnDay.length} {classesOnDay.length > 1 ? 'Clases' : 'Clase'}
                    </Badge>
                </div>
            )}
        </button>
    );
});


export function ClassSelectorModal({ plan, isOpen, onClose, onConfirm, overrideClassCount }: ClassSelectorModalProps) {
    const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [allClasses, setAllClasses] = useState<DanceClass[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [classesRes, usersRes] = await Promise.all([
                    fetch('/api/classes'),
                    fetch('/api/users'),
                ]);
                if(classesRes.ok) setAllClasses(await classesRes.json());
                if(usersRes.ok) setAllUsers(await usersRes.json());
            } catch(e) {
                toast({title: "Error", description: "No se pudieron cargar los datos de las clases."})
            }
        }
        fetchData();
    }, [toast]);

    useEffect(() => {
        if (isOpen) {
            setSelectedClasses([]);
            setCurrentMonth(new Date());
            setSelectedDate(new Date());
        }
    }, [isOpen]);

    const membershipEndDate = useMemo(() => {
        const now = new Date();
        if (plan.validityType === 'fixed' && plan.endDate) {
            return plan.endDate;
        }
        if (plan.validityType === 'monthly' && plan.validityMonths) {
            const startMonth = plan.monthlyStartType === 'next_month' ? addMonths(now, 1) : now;
            const startDate = plan.monthlyStartType === 'next_month' ? startOfMonth(startMonth) : now;
            return subMonths(addMonths(startDate, plan.validityMonths), 1);
        }
        if (plan.validityType === 'relative' && plan.durationUnit && plan.durationValue) {
            return add(now, { [plan.durationUnit]: plan.durationValue });
        }
        // Default fallback: 3 months from now
        return add(now, { months: 3 });
    }, [plan]);

    const classOccurrencesByDate = useMemo(() => {
        const allowed = plan.allowedClasses;
        let eligibleClasses: DanceClass[] = [];
        if (Array.isArray(allowed) && allowed.length > 0) {
            eligibleClasses = allClasses.filter(c => allowed.includes(c.id));
        } else {
            eligibleClasses = allClasses;
        }

        const visibleClasses = eligibleClasses.filter(c => c.type !== 'rental' && !c.isCancelledAndHidden);
        const occurrences: Record<string, DanceClass[]> = {};
        const interval = { start: new Date(), end: membershipEndDate };
        eachDayOfInterval(interval).forEach(day => {
            const dayOfWeekName = daysOfWeekMap[getDay(day)];
            const dateStr = format(day, 'yyyy-MM-dd');
            if (isBefore(day, new Date()) && !isSameDay(day, new Date())) return;
            visibleClasses.filter(c => c.type === 'recurring').forEach(c => {
                if (c.day === dayOfWeekName) {
                    if (!occurrences[dateStr]) occurrences[dateStr] = [];
                    occurrences[dateStr].push(c);
                }
            });
            visibleClasses.filter(c => c.type === 'one-time' || c.type === 'workshop').forEach(c => {
                 if (c.date && isSameDay(parseISO(c.date), day)) {
                    if (!occurrences[dateStr]) occurrences[dateStr] = [];
                    occurrences[dateStr].push(c);
                }
            });
        });
        return occurrences;
    }, [plan, membershipEndDate, allClasses]);
    
    const selectedDayClasses = selectedDate ? classOccurrencesByDate[format(selectedDate, 'yyyy-MM-dd')] || [] : [];

    const classCount = useMemo(() => {
        if (overrideClassCount) return overrideClassCount;
        if (plan.accessType === 'class_pack') {
            return plan.classCount || 0;
        }
        return 0;
    }, [plan, overrideClassCount]);

    const handleSelectClass = (classId: string, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setSelectedClasses(prev => {
            const isSelected = prev.some(sc => sc.classId === classId && sc.date === dateStr);
            if (isSelected) {
                return prev.filter(sc => !(sc.classId === classId && sc.date === dateStr));
            }
            if (prev.length < classCount) {
                return [...prev, { classId, date: dateStr }];
            }
            return prev;
        });
    };

    const classesLeftToSelect = classCount - selectedClasses.length;

    if (plan.accessType === 'time_pass') return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><CalendarIcon className="h-6 w-6" /> Selecciona tus Clases para "{plan.title}"</DialogTitle>
                    <DialogDescription>
                        Puedes elegir {classCount} {classCount > 1 ? 'clases' : 'clase'}. 
                        <Badge variant="secondary" className="ml-2">
                           {classesLeftToSelect > 0 ? `${classesLeftToSelect} restante(s)` : '¡Listo!'}
                        </Badge>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto -mx-6 px-6 py-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft /></Button>
                                    <CardTitle className="text-xl capitalize font-headline">{format(currentMonth, 'MMMM yyyy', {locale: es})}</CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight /></Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Calendar
                                        month={currentMonth} onMonthChange={setCurrentMonth} selected={selectedDate} onSelect={setSelectedDate} locale={es}
                                        disabled={(date) => isBefore(date, subMonths(new Date(), 1)) || isAfter(date, membershipEndDate)}
                                        components={{ Day: ({ date, displayMonth }) => (<DayContent date={date} displayMonth={displayMonth} isSelected={selectedDate ? isSameDay(date, selectedDate) : false} onClick={setSelectedDate} classesOnDay={classOccurrencesByDate[format(date, 'yyyy-MM-dd')] || []} />) }}
                                        classNames={{ table: "w-full border-collapse", head_row: "flex border-b", head_cell: "text-muted-foreground w-full text-center p-2 font-normal text-sm", row: "flex w-full mt-0 border-b", cell: "w-full text-center text-sm p-0 relative border-r last:border-r-0", day: "w-full h-full", day_disabled: "text-muted-foreground opacity-50 bg-muted/20 cursor-not-allowed", day_hidden: "invisible", }}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <h3 className="font-semibold mb-3 text-lg font-headline">Clases del {selectedDate ? format(selectedDate, 'PPP', {locale: es}) : '...'}</h3>
                             <ScrollArea className="h-[60vh] pr-4">
                                {selectedDayClasses.length > 0 ? (
                                    <div className="space-y-4">
                                    {selectedDayClasses.map(c => {
                                        const dateStr = format(selectedDate!, 'yyyy-MM-dd');
                                        const isSelected = selectedClasses.some(sc => sc.classId === c.id && sc.date === dateStr);
                                        const isDisabled = !isSelected && selectedClasses.length >= classCount;
                                        const teacherNames = allUsers.filter(u => c.teacherIds.includes(u.id)).map(t => t.name).join(', ');
                                        return (
                                            <div key={`${c.id}-${dateStr}`} className={cn("flex items-start space-x-3 rounded-md border p-3", isDisabled && "opacity-50 cursor-not-allowed", isSelected && "bg-primary/10 border-primary/50")}>
                                                <Checkbox id={`${c.id}-${dateStr}`} checked={isSelected} onCheckedChange={() => handleSelectClass(c.id, selectedDate!)} disabled={isDisabled} className="mt-1" />
                                                <Label htmlFor={`${c.id}-${dateStr}`} className={cn("flex flex-col w-full", !isDisabled && "cursor-pointer")}>
                                                    <span className="font-semibold">{c.name}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {c.time} - {teacherNames}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {c.capacity - c.enrolledStudentIds.length} libres</span>
                                                </Label>
                                                {isSelected && <CheckCircle className="h-5 w-5 text-primary ml-auto flex-shrink-0" />}
                                            </div>
                                        )
                                    })}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center min-h-96 text-center text-muted-foreground">
                                        <p>No hay clases programadas para este día.</p>
                                    </div>
                                )}
                             </ScrollArea>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onConfirm(selectedClasses.map(sc => sc.classId))} disabled={classesLeftToSelect > 0}>
                        Confirmar {classCount - classesLeftToSelect} Clase(s) y Pagar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
