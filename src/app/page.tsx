'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Music, Users, Heart, ArrowRight, Star, Sparkles, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSettings } from '@/context/settings-context';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [featuredTeachers, setFeaturedTeachers] = useState<User[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { settings, isLoading: isSettingsLoading } = useSettings();

  useEffect(() => {
    const fetchTeachers = async () => {
      setIsDataLoading(true);
      try {
        const response = await fetch('/api/users');
        if (!response.ok) return;
        const users: User[] = await response.json();
        const teachers = users.filter(u => (u.role === 'Profesor' || u.role === 'Socio') && u.isVisibleToStudents).slice(0, 3);
        setFeaturedTeachers(teachers);
      } catch (error) {
        console.error("Failed to fetch teachers for homepage:", error);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  if (isSettingsLoading || !settings) {
    return <div className="p-8"><Skeleton className="h-screen w-full rounded-3xl" /></div>
  }

  return (
    <div className="flex-1 bg-white overflow-hidden">
      {/* Hero Section */}
      <Carousel
        opts={{ loop: true }}
        className="relative w-full group"
      >
        <CarouselContent>
          {settings.heroSlides.map((slide, index) => (
            <CarouselItem key={slide.id || index}>
              <section className="relative w-full overflow-hidden flex items-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-secondary/30 -skew-x-12 translate-x-1/4 z-0" />
                <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />

                <div className="container mx-auto px-6 relative z-10">
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 animate-in slide-in-from-left duration-1000">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-gold text-xs font-bold tracking-widest uppercase">
                        <Sparkles className="w-3 h-3" /> {slide.heroSubtitle}
                      </div>
                      <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-foreground leading-[1.1]">
                        {slide.heroTitle.split(' ').map((word, i) => (
                          <span key={i} className={cn(i === 1 ? "text-gold italic block" : "block")}>
                            {word}
                          </span>
                        ))}
                      </h1>
                      <p className="text-xl text-muted-foreground max-w-lg font-light leading-relaxed">
                        {slide.heroDescription}
                      </p>
                      <div className="flex flex-wrap gap-4 pt-4">
                        <Button size="lg" className="rounded-full bg-foreground text-white hover:bg-gold transition-all duration-500 py-7 px-10 group" asChild>
                          <Link href={slide.heroButtonLink || '/'}>
                            {slide.heroButtonText} <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-full border-gold text-gold hover:bg-gold/5 py-7 px-10" asChild>
                          <Link href="/schedule">Ver Horarios</Link>
                        </Button>
                      </div>
                    </div>

                    <div className="relative aspect-[4/5] md:aspect-square lg:aspect-[4/5] animate-in zoom-in-95 duration-1000">
                      <div className="absolute inset-4 border border-gold/30 rounded-[2rem] -rotate-3 z-0" />
                      <div className="absolute inset-0 bg-gold/10 rounded-[2rem] rotate-2 z-0 shadow-2xl" />
                      <div className="relative h-full w-full rounded-[2rem] overflow-hidden z-10">
                        <Image
                          src={slide.heroImageUrl || "https://placehold.co/800x1200.png"}
                          alt={slide.heroTitle}
                          fill
                          priority={index === 0}
                          className="object-cover object-center transform transition-transform duration-[10s] hover:scale-110"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <CarouselPrevious className="static translate-y-0 w-12 h-12 bg-white/80 backdrop-blur border-none hover:bg-gold hover:text-white" />
          <CarouselNext className="static translate-y-0 w-12 h-12 bg-white/80 backdrop-blur border-none hover:bg-gold hover:text-white" />
        </div>
      </Carousel>

      {/* Philosophy Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-20 space-y-4">
            <h3 className="text-gold font-bold tracking-[0.2em] uppercase text-sm">Nuestra Filosofía</h3>
            <h2 className="text-4xl md:text-5xl font-serif">¿Por Qué FusionArte?</h2>
            <div className="w-20 h-1 bg-gold mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { icon: Star, title: "Excelencia Artística", desc: "Aprende con los mejores instructores del país.", color: "bg-gold/10 text-gold" },
              { icon: Music, title: "Ritmo y Pasión", desc: "Siente la música desde el primer paso.", color: "bg-black/5 text-foreground" },
              { icon: Users, title: "Comunidad Exclusiva", desc: "Un ambiente donde todos crecemos juntos.", color: "bg-gold/10 text-gold" },
              { icon: Heart, title: "Crecimiento Personal", desc: "Descubre tu mejor versión a través del baile.", color: "bg-black/5 text-foreground" }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-[2rem] hover:bg-secondary transition-all duration-500 border border-transparent hover:border-gold/20">
                <div className={cn("inline-flex p-5 rounded-2xl mb-6 transition-transform group-hover:scale-110", feature.color)}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Teachers */}
      <section className="py-24 bg-secondary/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="space-y-4 max-w-xl">
              <h3 className="text-gold font-bold tracking-[0.2em] uppercase text-sm">El Equipo</h3>
              <h2 className="text-4xl md:text-5xl font-serif">Maestros del Movimiento</h2>
            </div>
            <Button variant="link" className="text-gold p-0 h-auto text-lg group" asChild>
              <Link href="/teachers">Ver todo el equipo <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1" /></Link>
            </Button>
          </div>

          <div className="grid gap-12 md:grid-cols-3">
            {isDataLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[500px] w-full rounded-[2rem]" />)
            ) : (
              featuredTeachers.map((teacher, i) => (
                <div key={teacher.id} className="group relative rounded-[2rem] overflow-hidden h-[500px]">
                  <Image
                    src={teacher.avatar || "https://placehold.co/800x1200.png"}
                    alt={teacher.name}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 text-white space-y-2">
                    <p className="text-gold text-xs font-bold tracking-widest uppercase">Instructor</p>
                    <h4 className="text-3xl font-serif font-bold">{teacher.name}</h4>
                    <p className="text-white/70 text-sm font-light leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 line-clamp-2">
                      {teacher.bio || "Experto apasionado por transmitir el arte del movimiento."}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Results / Count Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 py-12 border-y border-gold/20">
            {[
              { val: "10+", label: "Años de Experiencia" },
              { val: "500+", label: "Alumnos Felices" },
              { val: "20+", label: "Estilos de Baile" }
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-2">
                <span className="text-6xl font-serif text-gold">{stat.val}</span>
                <p className="text-muted-foreground uppercase tracking-widest text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section with White/Gold overlay */}
      <section className="relative py-32 bg-foreground text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,#d4af37,transparent)]" />
        </div>
        <div className="container mx-auto px-6 text-center relative z-10 space-y-10">
          <h2 className="text-5xl md:text-7xl font-serif leading-tight">
            ¿Listo para brillar <br /> <span className="text-gold italic">en la pista?</span>
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-gold w-6 h-6" />
              <span className="font-light">Matrícula Abierta</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-gold w-6 h-6" />
              <span className="font-light">Primera Clase Gratis</span>
            </div>
          </div>
          <Button size="lg" className="rounded-full bg-gold text-white hover:bg-white hover:text-foreground transition-all duration-500 py-8 px-12 text-xl font-bold group" asChild>
            <Link href="/memberships">
              Empezar Ahora <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer minimal info */}
      <footer className="py-8 bg-white border-t border-secondary">
        <div className="container mx-auto px-6 text-center text-xs text-muted-foreground uppercase tracking-[0.3em]">
          © {new Date().getFullYear()} {settings.academyName} — All Rights Reserved
        </div>
      </footer>
    </div>
  );
}
