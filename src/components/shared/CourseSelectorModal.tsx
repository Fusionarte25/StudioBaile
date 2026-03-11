
'use client';
import { useState, useMemo, useEffect } from 'react';
import type { MembershipPlan, DanceClass } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Users, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type CourseSelectorModalProps = {
    plan: MembershipPlan;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (classIds: string[]) => void;
};

export function CourseSelectorModal({ plan, isOpen, onClose, onConfirm }: CourseSelectorModalProps) {
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [allClasses, setAllClasses] = useState<DanceClass[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const maxCourses = plan.maxCourses || 1;

    useEffect(() => {
        if (!isOpen) return;
        
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/classes');
                if(res.ok) {
                    const data: DanceClass[] = await res.json();
                    // Filter classes allowed by the plan
                    if (plan.allowedClasses && plan.allowedClasses.length > 0) {
                        setAllClasses(data.filter(c => plan.allowedClasses?.includes(c.id)));
                    } else {
                        // If no restrictions in plan, show all recurring/workshops
                        setAllClasses(data.filter(c => c.type !== 'rental' && !c.isCancelledAndHidden));
                    }
                }
            } catch(e) {
                toast({title: "Error", description: "No se pudieron cargar las clases."})
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
        setSelectedClassIds([]);
    }, [isOpen, plan, toast]);

    const handleToggleClass = (classId: string) => {
        setSelectedClassIds(prev => {
            if (prev.includes(classId)) {
                return prev.filter(id => id !== classId);
            }
            if (prev.length < maxCourses) {
                return [...prev, classId];
            }
            // If already at max, replace last one or do nothing? User said "if 2, must choose 2"
            // Let's just prevent more than max
            return prev;
        });
    };

    const remaining = maxCourses - selectedClassIds.length;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-primary" />
                        Selecciona tus Cursos
                    </DialogTitle>
                    <DialogDescription>
                        Este plan te permite elegir <strong>{maxCourses} {maxCourses === 1 ? 'curso' : 'cursos'}</strong> para asistir regularmente durante el mes.
                        {remaining > 0 && <Badge variant="secondary" className="ml-2">{remaining} por elegir</Badge>}
                        {remaining === 0 && <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white">¡Selección completa!</Badge>}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">Cargando cursos disponibles...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {allClasses.map(c => {
                                const isSelected = selectedClassIds.includes(c.id);
                                const isMaxed = selectedClassIds.length >= maxCourses && !isSelected;
                                return (
                                    <div 
                                        key={c.id} 
                                        className={cn(
                                            "relative group flex items-start space-x-4 rounded-xl border p-4 transition-all duration-200",
                                            isSelected ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "bg-card hover:bg-accent/5",
                                            isMaxed && "opacity-60 cursor-not-allowed"
                                        )}
                                        onClick={() => !isMaxed && handleToggleClass(c.id)}
                                    >
                                        <div className="pt-1">
                                            <Checkbox 
                                                id={`course-${c.id}`} 
                                                checked={isSelected} 
                                                disabled={isMaxed}
                                                className="h-5 w-5 rounded-full"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label 
                                                htmlFor={`course-${c.id}`} 
                                                className={cn("text-base font-semibold block leading-tight", !isMaxed && "cursor-pointer")}
                                            >
                                                {c.name}
                                            </Label>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {c.day}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.time}</span>
                                            </div>
                                            {c.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1 italic mt-1">{c.description}</p>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-4 right-4 text-primary animate-in zoom-in duration-300">
                                                <CheckCircle className="h-5 w-5 fill-primary text-primary-foreground" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {allClasses.length === 0 && !isLoading && (
                        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            No hay cursos específicos asignados a este plan o no se encontraron cursos activos.
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button 
                        onClick={() => onConfirm(selectedClassIds)} 
                        disabled={selectedClassIds.length < maxCourses}
                        className="min-w-[150px]"
                    >
                        {selectedClassIds.length < maxCourses 
                            ? `Elige ${remaining} más` 
                            : 'Confirmar Selección'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const CalendarIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
