
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
  contactEmail: z.string().email("Introduce un email válido."),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsappPhone: z.string().optional(),
  instagramUrl: z.string().url("URL de Instagram inválida.").or(z.literal('')).optional(),
  facebookUrl: z.string().url("URL de Facebook inválida.").or(z.literal('')).optional(),
  tiktokUrl: z.string().url("URL de TikTok inválida.").or(z.literal('')).optional(),
  openingHours: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  settings: AcademySettings;
}

export function ContactSettingsForm({ settings }: Props) {
    const { updateSettings } = useSettings();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            contactEmail: settings.contactEmail,
            address: settings.address,
            phone: settings.phone,
            whatsappPhone: settings.whatsappPhone,
            instagramUrl: settings.instagramUrl,
            facebookUrl: settings.facebookUrl,
            tiktokUrl: settings.tiktokUrl,
            openingHours: settings.openingHours,
        },
    });

    useEffect(() => {
        form.reset(settings);
    }, [settings, form]);

    async function onSubmit(data: FormValues) {
        await updateSettings(data);
        toast({
            title: "Configuración Guardada",
            description: "Los datos de contacto han sido actualizados.",
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de Contacto y Horarios</CardTitle>
                        <CardDescription>Esta información se mostrará en las páginas públicas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                <FormItem><FormLabel>Email de Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="whatsappPhone" render={({ field }) => (
                            <FormItem><FormLabel>Teléfono para WhatsApp</FormLabel><FormControl><Input placeholder="+34600123456" {...field} /></FormControl><FormDescription>Introduce el número completo con el código de país para el enlace de WhatsApp.</FormDescription><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Calle, Ciudad, Código Postal" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="openingHours" render={({ field }) => (
                            <FormItem><FormLabel>Horario de Atención</FormLabel><FormControl><Textarea placeholder="Lunes a Viernes: 10:00 - 22:00..." {...field} /></FormControl><FormDescription>Usa saltos de línea para separar los días. Se mostrará en la página de contacto.</FormDescription><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="instagramUrl" render={({ field }) => (
                                <FormItem><FormLabel>Instagram URL</FormLabel><FormControl><Input placeholder="https://instagram.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                                <FormItem><FormLabel>Facebook URL</FormLabel><FormControl><Input placeholder="https://facebook.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="tiktokUrl" render={({ field }) => (
                                <FormItem><FormLabel>TikTok URL</FormLabel><FormControl><Input placeholder="https://tiktok.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>Guardar Cambios</Button></CardFooter>
                </Card>
            </form>
        </Form>
    );
}
