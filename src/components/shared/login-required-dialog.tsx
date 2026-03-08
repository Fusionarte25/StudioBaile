
'use client';

import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type LoginRequiredDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
};

export function LoginRequiredDialog({ isOpen, onOpenChange }: LoginRequiredDialogProps) {
    const router = useRouter();

    const handleLoginRedirect = () => {
        router.push('/login');
        onOpenChange(false);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Acción Requerida</AlertDialogTitle>
                    <AlertDialogDescription>
                        Para realizar esta acción, necesitas iniciar sesión o crear una cuenta.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLoginRedirect}>
                        Acceder / Registrarse
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
