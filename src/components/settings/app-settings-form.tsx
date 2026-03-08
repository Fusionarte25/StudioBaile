
'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/settings-context";
import type { AcademySettings } from "@/lib/types";
import { useEffect } from "react";

const formSchema = z.object({
  enableNewSignups: z.boolean(),
  maintenanceMode: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  settings: AcademySettings;
}

export function AppSettingsForm({ settings }: Props) {
    const { updateSettings } = useSettings();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            enableNewSignups: settings.enableNewSignups,
            maintenanceMode: settings.maintenanceMode,
        },
    });
    
    useEffect(() => {
        form.reset(settings);
    }, [settings, form]);

    async function onSubmit(data: FormValues) {
        await updateSettings(data);
        toast({
            title: "Configuración Guardada",
            description: "Los ajustes de la aplicación han sido actualizados.",
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Ajustes de la Aplicación</CardTitle>
                        <CardDescription>Controla el comportamiento de la aplicación.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="enableNewSignups" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5"><FormLabel>Permitir Nuevos Registros</FormLabel><FormDescription>Activa esta opción para permitir que nuevos usuarios se registren.</FormDescription></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5"><FormLabel>Modo Mantenimiento</FormLabel><FormDescription>Desactiva el acceso a la aplicación para todos los usuarios excepto administradores.</FormDescription></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>Guardar Cambios</Button></CardFooter>
                </Card>
            </form>
        </Form>
    );
}
