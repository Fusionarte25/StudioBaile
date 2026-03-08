
'use client';
import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

function TeacherCard({ teacher }: { teacher: User }) {
    return (
        <Card className="overflow-hidden transition-shadow hover:shadow-xl">
            <CardHeader className="p-0">
                <Image
                    src={teacher.avatar}
                    alt={`Foto de ${teacher.name}`}
                    width={400}
                    height={400}
                    className="w-full h-auto object-cover aspect-square"
                    data-ai-hint="portrait professional"
                />
            </CardHeader>
            <CardContent className="p-6">
                <CardTitle className="font-headline text-2xl mb-2">{teacher.name}</CardTitle>
                <CardDescription className="mb-4 min-h-[60px]">{teacher.bio || 'Biografía no disponible.'}</CardDescription>
                <div className="flex flex-wrap gap-2">
                    {teacher.specialties?.map(specialty => (
                        <Badge key={specialty} variant="secondary">{specialty}</Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const allUsers: User[] = await response.json();
          const teacherUsers = allUsers.filter(user => (user.role === 'Profesor' || user.role === 'Socio') && user.isVisibleToStudents);
          setTeachers(teacherUsers);
        }
      } catch (error) {
        console.error("Failed to fetch teachers", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeachers();
  }, []);
    
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="space-y-2 mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">Conoce a Nuestros Instructores</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Apasionados, experimentados y dedicados a ayudarte a crecer como bailarín/a.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-0 space-y-4"><Skeleton className="h-96 w-full" /></CardContent></Card>
            ))
        ) : (
            teachers.map(teacher => (
                <TeacherCard key={teacher.id} teacher={teacher} />
            ))
        )}
      </div>
    </div>
  );
}
