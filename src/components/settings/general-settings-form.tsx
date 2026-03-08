
'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/context/settings-context";
import type { AcademySettings } from "@/lib/types";
import { useEffect } from "react";

const formSchema = z.object({
    academyName: z.string().min(1, "El nombre de la academia es obligatorio."),
    welcomeMessage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
    settings: AcademySettings;
}

export function GeneralSettingsForm({ settings }: Props) {
    const { updateSettings } = useSettings();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            academyName: settings.academyName,
            welcomeMessage: settings.welcomeMessage,
        },
    });

    useEffect(() => {
        form.reset(settings);
    }, [settings, form]);

    async function onSubmit(data: FormValues) {
        const success = await updateSettings(data);
        if (success) {
            toast({
                title: "Configuración Guardada",
                description: "Los ajustes generales han sido actualizados.",
            });
        } else {
            toast({
                title: "Error al guardar",
                description: "No se pudieron guardar los cambios en el servidor.",
                variant: "destructive",
            });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Ajustes Generales</CardTitle>
                        <CardDescription>Configura los ajustes generales de la academia.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="academyName" render={({ field }) => (
                            <FormItem><FormLabel>Nombre de la Academia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="welcomeMessage" render={({ field }) => (
                            <FormItem><FormLabel>Mensaje de Bienvenida</FormLabel><FormControl><Textarea {...field} /></FormControl><FormDescription>Este mensaje podría aparecer en el dashboard.</FormDescription><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={form.formState.isSubmitting}>Guardar Cambios</Button></CardFooter>
                </Card>
            </form>
        </Form>
    );
}
