
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck } from 'lucide-react';

export default function AttendancePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <ClipboardCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="mt-4 font-headline">Gestión de Asistencia</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible próximamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aquí podrás tomar asistencia de los alumnos a las diferentes clases de forma rápida y sencilla.</p>
        </CardContent>
      </Card>
    </div>
  );
}
