
'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/context/settings-context";
import type { AcademySettings } from "@/lib/types";
import { useEffect } from "react";

const formSchema = z.object({
  registrationEmailMessage: z.string().optional(),
  membershipEmailMessage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  settings: AcademySettings;
}

export function EmailTemplatesForm({ settings }: Props) {
    const { updateSettings } = useSettings();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            registrationEmailMessage: settings.registrationEmailMessage,
            membershipEmailMessage: settings.membershipEmailMessage,
        },
    });

    useEffect(() => {
        form.reset(settings);
    }, [settings, form]);

    async function onSubmit(data: FormValues) {
        await updateSettings(data);
        toast({
            title: "Configuración Guardada",
            description: "Las plantillas de email han sido actualizadas.",
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Plantillas de Email</CardTitle>
                        <CardDescription>Personaliza los mensajes automáticos que se envían a los usuarios.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="registrationEmailMessage" render={({ field }) => (
                            <FormItem><FormLabel>Mensaje de Bienvenida (Registro)</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl><FormDescription>Este mensaje se enviará a los nuevos usuarios al registrarse. Usa {'{{name}}'} para insertar el nombre del usuario.</FormDescription><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="membershipEmailMessage" render={({ field }) => (
                            <FormItem><FormLabel>Mensaje de Agradecimiento (Membresía)</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl><FormDescription>Este mensaje se incluirá en el email de confirmación de compra de membresía.</FormDescription><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>Guardar Cambios</Button></CardFooter>
                </Card>
            </form>
        </Form>
    );
}
