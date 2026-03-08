
'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/context/settings-context";
import React, { useEffect } from "react";
import Image from "next/image";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { AcademySettings } from "@/lib/types";

const heroSlideSchema = z.object({
  id: z.string().optional(),
  heroTitle: z.string().min(1, "El título es obligatorio."),
  heroSubtitle: z.string().optional(),
  heroDescription: z.string().optional(),
  heroButtonText: z.string().min(1, "El texto del botón es obligatorio."),
  heroButtonLink: z.string().url("Debe ser una URL válida.").or(z.literal('')),
  heroImageUrl: z.string().optional(),
});

const formSchema = z.object({
  heroSlides: z.array(heroSlideSchema).min(1, "Debe haber al menos una diapositiva."),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  settings: AcademySettings;
}

export function HeroSlidesForm({ settings }: Props) {
    const { updateSettings } = useSettings();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            heroSlides: settings.heroSlides,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "heroSlides",
    });

    useEffect(() => {
        form.reset({ heroSlides: settings.heroSlides });
    }, [settings, form]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: `heroSlides.${number}.heroImageUrl`) => {
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
            description: "Las diapositivas de la página principal han sido actualizadas.",
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Diapositivas de la Página Principal</CardTitle>
                        <CardDescription>Gestiona el contenido del carrusel en la página de inicio. Añade, edita o elimina diapositivas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const heroImageInputRef = React.createRef<HTMLInputElement>();
                                const watchedHeroImage = form.watch(`heroSlides.${index}.heroImageUrl`);
                                return (
                                    <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold">Diapositiva {index + 1}</h4>
                                            {fields.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <Separator />
                                        <FormField control={form.control} name={`heroSlides.${index}.heroTitle`} render={({ field }) => (<FormItem><FormLabel>Título Principal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`heroSlides.${index}.heroSubtitle`} render={({ field }) => (<FormItem><FormLabel>Subtítulo</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Texto más pequeño que aparece sobre el título.</FormDescription><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`heroSlides.${index}.heroDescription`} render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name={`heroSlides.${index}.heroButtonText`} render={({ field }) => (<FormItem><FormLabel>Texto del Botón</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`heroSlides.${index}.heroButtonLink`} render={({ field }) => (<FormItem><FormLabel>Enlace del Botón</FormLabel><FormControl><Input {...field} placeholder="/schedule" /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`heroSlides.${index}.heroImageUrl`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Imagen Principal</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-4">
                                                            <Image src={watchedHeroImage || "https://placehold.co/800x1200.png"} alt={form.getValues(`heroSlides.${index}.heroTitle`) || "Imagen de portada"} width={100} height={150} className="object-contain border rounded-md" />
                                                            <Button type="button" variant="outline" onClick={() => handleImageClick(heroImageInputRef)}>Subir Imagen</Button>
                                                            <input type="file" ref={heroImageInputRef} onChange={(e) => handleFileChange(e, `heroSlides.${index}.heroImageUrl`)} className="hidden" accept="image/png, image/jpeg, image/gif" />
                                                        </div>
                                                    </FormControl>
                                                    <FormDescription>Imagen grande que aparece en la diapositiva. Se recomienda una imagen vertical (ej: 800x1200px).</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ heroTitle: "Nuevo Título", heroButtonText: "Saber Más", heroButtonLink: "/", heroImageUrl: "https://placehold.co/800x1200.png" })}>
                            <PlusCircle className="mr-2" /> Añadir Diapositiva
                        </Button>
                        <FormMessage>{form.formState.errors.heroSlides?.message}</FormMessage>
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>Guardar Cambios</Button></CardFooter>
                </Card>
            </form>
        </Form>
    );
}
