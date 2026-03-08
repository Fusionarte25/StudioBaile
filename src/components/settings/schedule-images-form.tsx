
'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/settings-context";
import React, { useEffect } from "react";
import Image from "next/image";
import { PlusCircle, Trash2 } from "lucide-react";
import type { AcademySettings } from "@/lib/types";

const scheduleImageSchema = z.object({
    id: z.string().optional(),
    url: z.string().min(1, "La URL de la imagen no puede estar vacía."),
    alt: z.string().optional(),
});

const formSchema = z.object({
  scheduleImages: z.array(scheduleImageSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  settings: AcademySettings;
}

export function ScheduleImagesForm({ settings }: Props) {
    const { updateSettings } = useSettings();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            scheduleImages: settings.scheduleImages || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "scheduleImages",
    });

    useEffect(() => {
        form.reset({ scheduleImages: settings.scheduleImages || [] });
    }, [settings, form]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: `scheduleImages.${number}.url`) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                form.setValue(fieldName, reader.result as string, { shouldDirty: true, shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleImageClick = (ref: React.RefObject<HTMLInputElement>) => {
        ref.current?.click();
    };

    async function onSubmit(data: FormValues) {
        await updateSettings(data);
        toast({
            title: "Configuración Guardada",
            description: "Las imágenes de horario han sido actualizadas.",
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Imágenes de Horarios</CardTitle>
                        <CardDescription>Sube imágenes de tus horarios para mostrarlas en la página de "Clases y Horarios". Puedes subir hasta 3.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const imageInputRef = React.createRef<HTMLInputElement>();
                                const watchedImage = form.watch(`scheduleImages.${index}.url`);
                                return (
                                    <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold">Imagen de Horario {index + 1}</h4>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`scheduleImages.${index}.url`}
                                            render={() => (
                                                <FormItem>
                                                    <FormLabel className="sr-only">URL de la Imagen</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-4">
                                                            <Image src={watchedImage || "https://placehold.co/600x400.png"} alt={form.getValues(`scheduleImages.${index}.alt`) || `Horario ${index + 1}`} width={200} height={150} className="object-contain border rounded-md" />
                                                            <Button type="button" variant="outline" onClick={() => handleImageClick(imageInputRef)}>Cambiar Imagen</Button>
                                                            <input type="file" ref={imageInputRef} onChange={(e) => handleFileChange(e, `scheduleImages.${index}.url`)} className="hidden" accept="image/png, image/jpeg, image/gif" />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField control={form.control} name={`scheduleImages.${index}.alt`} render={({ field }) => (<FormItem><FormLabel>Texto Alternativo (Alt)</FormLabel><FormControl><Input {...field} placeholder="Ej: Horario de Clases de Salsa y Bachata" /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                )
                            })}
                        </div>
                        {fields.length < 3 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => append({ url: "https://placehold.co/600x400.png", alt: "" })}
                            >
                                <PlusCircle className="mr-2" />
                                Añadir Imagen de Horario
                            </Button>
                        )}
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>Guardar Cambios</Button></CardFooter>
                </Card>
            </form>
        </Form>
    );
}
