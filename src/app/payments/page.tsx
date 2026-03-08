
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function PaymentsPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
            <DollarSign className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="mt-4 font-headline">Gestión de Pagos</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible próximamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">En esta sección podrás registrar y consultar los pagos de las membresías de los estudiantes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
