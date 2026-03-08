
'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/settings-context";
import React, { useRef, useEffect } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AcademySettings } from "@/lib/types";

const formSchema = z.object({
    logoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
    settings: AcademySettings;
}

export function IdentitySettingsForm({ settings }: Props) {
    const { updateSettings } = useSettings();
    const { toast } = useToast();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            logoUrl: settings.logoUrl,
            faviconUrl: settings.faviconUrl,
        },
    });

    useEffect(() => {
        form.reset(settings);
    }, [settings, form]);

    const watchedLogo = form.watch('logoUrl');
    const watchedFavicon = form.watch('faviconUrl');

    const handleImageClick = (ref: React.RefObject<HTMLInputElement>) => {
        ref.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: 'logoUrl' | 'faviconUrl') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                form.setValue(fieldName, reader.result as string, { shouldDirty: true, shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };

    async function onSubmit(data: FormValues) {
        const success = await updateSettings(data);
        if (success) {
            toast({
                title: "Configuración Guardada",
                description: "La identidad visual ha sido actualizada.",
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
                        <CardTitle>Identidad Visual</CardTitle>
                        <CardDescription>Gestiona el logo y el ícono de tu academia.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-8">
                        <FormField control={form.control} name="logoUrl" render={() => (
                            <FormItem>
                                <FormLabel>Logo de la Academia</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-20 w-20 rounded-md cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleImageClick(logoInputRef)}>
                                            <AvatarImage src={watchedLogo} className="object-contain" />
                                            <AvatarFallback className="rounded-md">{settings.academyName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <Button type="button" variant="outline" onClick={() => handleImageClick(logoInputRef)}>Subir Logo</Button>
                                        <input type="file" ref={logoInputRef} onChange={(e) => handleFileChange(e, 'logoUrl')} className="hidden" accept="image/png, image/jpeg, image/gif, image/svg+xml" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="faviconUrl" render={() => (
                            <FormItem>
                                <FormLabel>Ícono del Navegador (Favicon)</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-20 w-20 rounded-md cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleImageClick(faviconInputRef)}>
                                            <AvatarImage src={watchedFavicon} className="object-contain" />
                                            <AvatarFallback className="rounded-md">ICO</AvatarFallback>
                                        </Avatar>
                                        <Button type="button" variant="outline" onClick={() => handleImageClick(faviconInputRef)}>Subir Ícono</Button>
                                        <input type="file" ref={faviconInputRef} onChange={(e) => handleFileChange(e, 'faviconUrl')} className="hidden" accept="image/png, image/x-icon, image/svg+xml" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>Guardar Cambios</Button></CardFooter>
                </Card>
            </form>
        </Form>
    );
}
