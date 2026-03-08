
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type BackButtonProps = {
    href: string;
    children: React.ReactNode;
};

export function BackButton({ href, children }: BackButtonProps) {
    const router = useRouter();

    return (
        <Button variant="ghost" asChild>
            <Link href={href}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {children}
            </Link>
        </Button>
    );
}
