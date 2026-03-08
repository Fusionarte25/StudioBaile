'use client';
import { useSettings } from "@/context/settings-context";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { IdentitySettingsForm } from "@/components/settings/identity-settings-form";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { ContactSettingsForm } from "@/components/settings/contact-settings-form";
import { EmailTemplatesForm } from "@/components/settings/email-templates-form";
import { AppSettingsForm } from "@/components/settings/app-settings-form";
import { AboutUsSettingsForm } from "@/components/settings/about-us-form";
import { HeroSlidesForm } from "@/components/settings/hero-slides-form";
import { ScheduleImagesForm } from "@/components/settings/schedule-images-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Palette, Mail, Layout, Info, Image as ImageIcon, Contact2 } from "lucide-react";

export default function AdminSettingsPage() {
  const { settings, isLoading } = useSettings();

  if (isLoading || !settings) {
    return (
      <div className="p-6 md:p-10 space-y-8 animate-pulse">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-32 rounded-lg" />)}
        </div>
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-gold font-headline">Configuración</h1>
        <p className="text-muted-foreground text-lg">Personaliza la experiencia y apariencia de tu academia.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-8">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-secondary/50 p-1 border border-border/50 rounded-xl flex w-max">
            <TabsTrigger value="general" className="px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gold data-[state=active]:shadow-sm transition-all duration-300 gap-2">
              <Settings className="w-4 h-4" /> General
            </TabsTrigger>
            <TabsTrigger value="identidad" className="px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gold data-[state=active]:shadow-sm transition-all duration-300 gap-2">
              <Palette className="w-4 h-4" /> Identidad
            </TabsTrigger>
            <TabsTrigger value="contacto" className="px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gold data-[state=active]:shadow-sm transition-all duration-300 gap-2">
              <Contact2 className="w-4 h-4" /> Contacto
            </TabsTrigger>
            <TabsTrigger value="contenido" className="px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gold data-[state=active]:shadow-sm transition-all duration-300 gap-2">
              <Layout className="w-4 h-4" /> Contenido Web
            </TabsTrigger>
            <TabsTrigger value="correo" className="px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:text-gold data-[state=active]:shadow-sm transition-all duration-300 gap-2">
              <Mail className="w-4 h-4" /> Notificaciones
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <GeneralSettingsForm settings={settings} />
            <AppSettingsForm settings={settings} />
          </div>
        </TabsContent>

        <TabsContent value="identidad" className="animate-in slide-in-from-bottom-2 duration-500">
          <IdentitySettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="contacto" className="animate-in slide-in-from-bottom-2 duration-500">
          <ContactSettingsForm settings={settings} />
        </TabsContent>

        <TabsContent value="contenido" className="space-y-12 animate-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 gap-12">
            <div id="about" className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-gold"><Info className="w-6 h-6" /> Acerca de Nosotros</h2>
              <AboutUsSettingsForm settings={settings} />
            </div>
            <div id="carousel" className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-gold"><ImageIcon className="w-6 h-6" /> Carrusel de Inicio</h2>
              <HeroSlidesForm settings={settings} />
            </div>
            <div id="schedule" className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-gold"><Layout className="w-6 h-6" /> Fotos de Horarios</h2>
              <ScheduleImagesForm settings={settings} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="correo" className="animate-in slide-in-from-bottom-2 duration-500">
          <EmailTemplatesForm settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
