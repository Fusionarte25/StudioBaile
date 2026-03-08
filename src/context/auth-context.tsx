
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { User, StudentMembership, StudentPayment } from '@/lib/types';
import { useAttendance } from './attendance-context';

export type UserRole = 'Admin' | 'Profesor' | 'Estudiante' | 'Administrativo' | 'Socio';

export interface AuthContextType {
  userRole: UserRole | null;
  userId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  currentUser: User | null;
  updateCurrentUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/login', '/', '/about', '/schedule', '/memberships', '/teachers', '/contact', '/register'];

const protectedRoutes: { path: string; roles: UserRole[] }[] = [
  { path: '/admin', roles: ['Admin', 'Socio', 'Administrativo'] },
  { path: '/my-classes', roles: ['Profesor', 'Socio'] },
  { path: '/my-finances', roles: ['Profesor', 'Socio'] },
  { path: '/profile', roles: ['Estudiante', 'Profesor', 'Admin', 'Administrativo', 'Socio'] },
];

const checkAccess = (pathname: string, role: UserRole | null): { authorized: boolean; redirect?: string } => {
    if (publicPaths.some(p => p === pathname || (p !== '/' && pathname.startsWith(p)))) {
        return { authorized: true };
    }

    if (!role) {
        return { authorized: false, redirect: '/login' };
    }
    
    const sortedRoutes = [...protectedRoutes].sort((a, b) => b.path.length - a.path.length);
    const routeConfig = sortedRoutes.find(route => pathname.startsWith(route.path));

    if (routeConfig) {
        if (routeConfig.roles.includes(role)) {
            return { authorized: true };
        } else {
            let defaultPath = '/profile';
            if (role === 'Profesor' || role === 'Socio') defaultPath = '/my-classes';
            if (role === 'Admin' || role === 'Administrativo') defaultPath = '/admin/dashboard';
            return { authorized: false, redirect: defaultPath };
        }
    }

    return { authorized: false, redirect: '/' };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { resetAttendance } = useAttendance();

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuthStatus = async () => {
      let storedUser: User | null = null;
      try {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) storedUser = JSON.parse(userJson);
      } catch (e) {
        console.error("Could not access localStorage", e);
      }

      if (storedUser) {
        setUserRole(storedUser.role as UserRole);
        setUserId(storedUser.id);
        setCurrentUser(storedUser);
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isLoading) return; // Wait until initial auth check is done

    const currentRole = currentUser?.role as UserRole | null;
    const { authorized, redirect } = checkAccess(pathname, currentRole);

    if (!authorized) {
      if (redirect === '/login' && pathname !== '/login') {
        try {
          localStorage.setItem('redirectPath', pathname);
        } catch (error) {
          console.error("Could not access localStorage", error);
        }
      }
      router.replace(redirect || '/login');
    }
  }, [pathname, router, isLoading, currentUser]);


  const login = async (email: string, pass: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to login');
    }

    const user: User = await response.json();
    
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
      const role = user.role as UserRole;
      setUserRole(role);
      setUserId(user.id);
      setCurrentUser(user);

      const redirectPath = localStorage.getItem('redirectPath');
      localStorage.removeItem('redirectPath');

      if (redirectPath && redirectPath !== '/login') {
        router.push(redirectPath);
      } else {
         if (role === 'Estudiante') router.push('/profile');
         else if (role === 'Profesor' || role === 'Socio') router.push('/my-classes');
         else router.push('/admin/dashboard');
      }
    } catch (error) {
       console.error("Could not access localStorage", error);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('currentUser');
      setUserRole(null);
      setUserId(null);
      setCurrentUser(null);
      resetAttendance();
      router.push('/login');
    } catch (error) {
      console.error("Could not access localStorage", error);
    }
  };

  const updateCurrentUser = useCallback((data: Partial<User>) => {
    setCurrentUser(prev => {
        if (!prev) return null;
        const updatedUser = { ...prev, ...data };
        try {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        } catch(e) { console.error(e) }
        return updatedUser;
    });
  }, []);

  const value = {
    userRole, userId, isAuthenticated: !!userRole,
    isLoading, login, logout, currentUser, updateCurrentUser,
  };
  
  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Skeleton className="h-20 w-20 rounded-full" /></div>
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
