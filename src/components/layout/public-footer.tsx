'use client';

import Link from 'next/link';
import { LogoIcon } from '@/components/icons/logo-icon';
import { useSettings } from '@/context/settings-context';
import { Facebook, Instagram } from 'lucide-react';
import { TikTokIcon } from '@/components/icons/tiktok-icon';
import Image from 'next/image';

export function PublicFooter() {
  const { settings } = useSettings();

  if (!settings) return null;

  return (
    <footer className="bg-zinc-950 text-white pt-24 pb-10 border-t-4 border-gold relative overflow-hidden mt-auto">
      {/* Background elegant gradient/glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-gold/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center gap-3 group">
              {settings.logoUrl ? (
                <div className="bg-white p-2 rounded-xl group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all">
                  <Image src={settings.logoUrl} alt={settings.academyName} width={36} height={36} className="h-9 w-auto object-contain" />
                </div>
              ) : (
                <LogoIcon className="h-10 w-10 text-gold" />
              )}
              <div className="flex flex-col">
                <span className="font-serif font-bold text-2xl tracking-tight text-white">{settings.academyName}</span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold mt-1">Academy of Dance</span>
              </div>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed font-light">
              {settings.welcomeMessage || "Descubre tu pasión por el baile en un ambiente exclusivo y profesional. Únete a nuestra comunidad y deja que el movimiento te transforme."}
            </p>
            <div className="flex gap-4 pt-2">
              {[
                { icon: Instagram, href: settings.instagramUrl },
                { icon: Facebook, href: settings.facebookUrl },
                { icon: TikTokIcon, href: settings.tiktokUrl }
              ].map((social, i) => social.href && (
                <Link key={i} href={social.href} target="_blank" className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-gold hover:bg-gold hover:text-zinc-950 hover:border-gold transition-all duration-300">
                  <social.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="font-serif text-lg font-bold mb-6 text-white flex items-center gap-2">
              <span className="w-4 h-px bg-gold"></span>
              Menú Principal
            </h4>
            <ul className="space-y-4">
              {[
                { label: 'Inicio', href: '/' },
                { label: 'Acerca de Nosotros', href: '/about' },
                { label: 'Profesores', href: '/teachers' },
                { label: 'Membresías', href: '/memberships' },
                { label: 'Acceso Alumnos', href: '/login' },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-zinc-400 hover:text-gold transition-colors block w-fit">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="font-serif text-lg font-bold mb-6 text-white flex items-center gap-2">
              <span className="w-4 h-px bg-gold"></span>
              Clases y Horarios
            </h4>
            <ul className="space-y-4">
              {[
                { label: 'Ver Horarios', href: '/schedule' },
                { label: 'Reservar Clase', href: '/schedule' },
                { label: 'Estilos de Baile', href: '/styles' },
                { label: 'Preguntas Frecuentes', href: '/contact' },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-zinc-400 hover:text-gold transition-colors block w-fit">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="font-serif text-lg font-bold mb-6 text-white flex items-center gap-2">
              <span className="w-4 h-px bg-gold"></span>
              Contacto
            </h4>
            <ul className="space-y-4 text-sm text-zinc-400 font-light">
              <li className="flex items-start gap-3">
                <span className="text-gold mt-1 font-serif">•</span>
                <span><strong className="text-zinc-300 font-medium block mb-1">Dirección:</strong> {settings.address || "Calle de la Danza 123"}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold mt-1 font-serif">•</span>
                <span><strong className="text-zinc-300 font-medium block mb-1">Email:</strong> <a href={`mailto:${settings.contactEmail}`} className="hover:text-gold transition-colors">{settings.contactEmail || "info@fusionarte.com"}</a></span>
              </li>
              {settings.phone && (
                <li className="flex items-start gap-3">
                  <span className="text-gold mt-1 font-serif">•</span>
                  <span><strong className="text-zinc-300 font-medium block mb-1">Teléfono:</strong> <a href={`tel:${settings.phone}`} className="hover:text-gold transition-colors">{settings.phone}</a></span>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} {settings.academyName}. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <span className="text-xs text-zinc-600 uppercase tracking-widest cursor-not-allowed">Privacidad</span>
            <span className="text-xs text-zinc-600 uppercase tracking-widest cursor-not-allowed">Términos Legales</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
