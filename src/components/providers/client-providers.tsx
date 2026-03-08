'use client';

import { useEffect } from 'react';
import { SettingsProvider } from '@/context/settings-context';
import { AttendanceProvider } from '@/context/attendance-context';
import { AuthProvider } from '@/context/auth-context';
import { MainNav } from '@/components/layout/main-nav';
import { PublicFooter } from '@/components/layout/public-footer';
import { Toaster } from "@/components/ui/toaster";
import { TaskAlerts } from '@/components/shared/task-alerts';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(
          function (registration) {
            console.log('ServiceWorker registration successful');
          },
          function (err) {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return (
    <SettingsProvider>
      <AttendanceProvider>
        <AuthProvider>
          <div className="flex flex-col min-h-screen bg-background">
            <MainNav />
            <main className="flex-1 flex flex-col">{children}</main>
            <PublicFooter />
            <Toaster />
            <TaskAlerts />
          </div>
        </AuthProvider>
      </AttendanceProvider>
    </SettingsProvider>
  );
}
