
'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LogoIcon } from "@/components/icons/logo-icon";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from '@/context/settings-context';
import Image from 'next/image';
import { sendEmail } from '@/lib/email';

const registerFormSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    email: z.string().email({ message: "Por favor, introduce un email válido." }),
    password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { settings } = useSettings();

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerFormSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        if (!settings) return; // Should not happen if page is rendered

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    role: 'Estudiante',
                    avatar: `https://placehold.co/100x100.png?text=${data.name.split(' ').map(n => n[0]).join('')}`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'No se pudo completar el registro.');
            }

            toast({
                title: "¡Registro Exitoso!",
                description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión.",
            });

            const emailHtml = `
              <h1>¡Bienvenido a ${settings.academyName}, ${data.name}!</h1>
              <p>${settings.registrationEmailMessage?.replace('{{name}}', data.name).replace('{{academyName}}', settings.academyName) || 'Gracias por registrarte.'}</p>
              <p>¡Te esperamos en la pista!</p>
            `;
            
            await sendEmail({
              from: `${settings.academyName} <no-reply@fusionarte.com>`,
              to: data.email,
              subject: `¡Bienvenido/a a ${settings.academyName}!`,
              html: emailHtml,
            });
            
            router.push('/login');
        } catch (error) {
            toast({
                title: "Error en el registro",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };
    
    if (!settings) return null; // or a loading skeleton

    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {settings.logoUrl ? (
                            <Image src={settings.logoUrl} alt={settings.academyName} width={40} height={40} className="h-10 w-auto" />
                        ) : (
                            <LogoIcon className="h-10 w-10 text-primary" />
                        )}
                        <span className="font-bold text-3xl font-headline">{settings.academyName}</span>
                    </div>
                    <CardTitle className="text-2xl">Crea tu Cuenta</CardTitle>
                    <CardDescription>Únete a nuestra comunidad y empieza a bailar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Completo</FormLabel>
                                    <FormControl><Input placeholder="Ana López" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="tu@email.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirmar Contraseña</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="justify-center text-sm">
                    <p className="text-muted-foreground">¿Ya tienes una cuenta? <Link href="/login" className="text-primary hover:underline font-medium">Inicia Sesión</Link></p>
                </CardFooter>
            </Card>
        </div>
    );
}
