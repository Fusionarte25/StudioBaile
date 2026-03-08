
'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Cake } from 'lucide-react';
import { format, getMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function BirthdayCalendar() {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                if (res.ok) {
                    setUsers(await res.json());
                }
            } catch (error) {
                console.error("Failed to fetch users for birthday calendar", error);
            }
        };
        fetchUsers();
    }, []);

    const students = users.filter(u => u.role === 'Estudiante' && u.dob);
    const currentMonth = getMonth(new Date());

    const birthdaysThisMonth = students
        .filter(s => getMonth(parseISO(s.dob!)) === currentMonth)
        .sort((a, b) => parseISO(a.dob!).getDate() - parseISO(b.dob!).getDate());

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Cake className="h-5 w-5 text-primary" />
                    Cumpleaños del Mes
                </CardTitle>
                <CardDescription>
                    Alumnos que cumplen años este mes. ¡No te olvides de saludarlos!
                </CardDescription>
            </CardHeader>
            <CardContent>
                {birthdaysThisMonth.length > 0 ? (
                    <ul className="space-y-4">
                        {birthdaysThisMonth.map(student => (
                            <li key={student.id} className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={student.avatar} alt={student.name} />
                                    <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(parseISO(student.dob!), "d 'de' MMMM", { locale: es })}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No hay cumpleaños este mes.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
