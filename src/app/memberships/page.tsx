
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { MembershipPlan, StudentPayment, PriceTier } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { ClassSelectorModal } from '@/components/shared/ClassSelectorModal';
import { CustomPackModal } from '@/components/shared/CustomPackModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LoginRequiredDialog } from '@/components/shared/login-required-dialog';
import Link from 'next/link';
import { useSettings } from '@/context/settings-context';
import { add, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const getPlanPriceDisplay = (plan: MembershipPlan) => {
  if (plan.accessType === 'time_pass' && plan.durationUnit && plan.durationValue) {
    const unitMap = {
      days: plan.durationValue === 1 ? 'día' : 'días',
      weeks: plan.durationValue === 1 ? 'semana' : 'semanas',
      months: plan.durationValue === 1 ? 'mes' : 'meses',
    };
    return `/${plan.durationValue} ${unitMap[plan.durationUnit]}`;
  }
  if (plan.accessType === 'class_pack') {
    return ` / ${plan.classCount} clases`;
  }
  if (plan.accessType === 'custom_pack') {
    return `/ bono personalizable`;
  }
  return '/ pago único';
};

function PlanCard({ plan, onPurchaseRequest }: { plan: MembershipPlan, onPurchaseRequest: (plan: MembershipPlan) => void }) {
  const price = 'price' in plan && typeof plan.price === 'number' ? plan.price : 0;
  return (
    <Card className={cn(
      "flex flex-col",
      plan.isPopular && "border-primary shadow-lg"
    )}>
      {plan.isPopular && (
        <div className="absolute -top-3 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <Star className="h-3 w-3" />
          Popular
        </div>
      )}
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-2xl">{plan.title}</CardTitle>
        <CardDescription>
          {plan.accessType === 'custom_pack' && Array.isArray(plan.priceTiers) && plan.priceTiers.length > 0
            ? <span className="text-4xl font-bold text-foreground">Desde €{(plan.priceTiers[0] as PriceTier).price}</span>
            : <span className="text-4xl font-bold text-foreground">€{price}</span>
          }
          <span className="text-muted-foreground">{getPlanPriceDisplay(plan)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant={plan.isPopular ? 'default' : 'outline'} onClick={() => onPurchaseRequest(plan)}>
          {plan.accessType === 'custom_pack' ? 'Personalizar Bono' : 'Adquirir Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function MembershipsPage() {
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { userRole, userId, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isCustomPackOpen, setIsCustomPackOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [planToConfirm, setPlanToConfirm] = useState<MembershipPlan | null>(null);
  const [customPackConfig, setCustomPackConfig] = useState<{classCount: number; totalPrice: number;} | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/memberships');
            if (res.ok) {
                const plansData: MembershipPlan[] = await res.json();
                setMembershipPlans(plansData.filter(p => p.visibility === 'public'));
            }
        } catch(e) {
            toast({ title: "Error", description: "No se pudieron cargar los planes." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchPlans();
  }, [toast]);


  const handlePurchaseRequest = (plan: MembershipPlan) => {
    if (!isAuthenticated || !userId) {
        setIsLoginDialogOpen(true);
        return;
    }
    if (userRole !== 'Estudiante') {
        toast({ title: "Acción no permitida", description: "Solo los estudiantes pueden adquirir membresías.", variant: "destructive" });
        return;
    }
    
    if (!plan.id) {
        toast({ title: "Error", description: "No se pudo identificar el plan. Por favor, recarga la página.", variant: "destructive" });
        return;
    }

    setSelectedPlan(plan);

    if (plan.accessType === 'time_pass' || plan.accessType === 'class_pack') {
        setPlanToConfirm(plan);
    } else if (plan.accessType === 'custom_pack') {
        setIsCustomPackOpen(true);
    }
  };

  const processPurchase = async (planToPurchase: MembershipPlan, customConfig?: { classCount: number, totalPrice: number }) => {
    if (!userId) return;

    if (!planToPurchase.id) {
        toast({
            title: "Error en la compra",
            description: "No se pudo identificar el plan seleccionado. Por favor, recarga la página e inténtalo de nuevo.",
            variant: "destructive",
        });
        return;
    }
    
    try {
        const response = await fetch('/api/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId, 
                planId: planToPurchase.id,
                classCount: customConfig?.classCount,
                totalPrice: customConfig?.totalPrice
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || errorData.error || 'No se pudo completar la compra.');
        }
        
        toast({
            title: "¡Membresía adquirida con éxito!",
            description: "Se ha generado tu factura. Revisa tu perfil para más detalles.",
        });

        router.push('/profile');

    } catch (error) {
        toast({
            title: "Error en la compra",
            description: (error as Error).message,
            variant: "destructive",
        });
    }
  };

  const handleConfirmPurchase = () => {
    if (!planToConfirm) return;
    processPurchase(planToConfirm);
    setPlanToConfirm(null);
  };
  
  const handleCustomPackTierSelected = (tier: PriceTier) => {
    if (!selectedPlan || selectedPlan.accessType !== 'custom_pack') return;

    processPurchase(selectedPlan, { classCount: tier.classCount, totalPrice: tier.price });
    setIsCustomPackOpen(false);
    setSelectedPlan(null);
  };
  
  return (
    <>
      <div className="container mx-auto p-4 md:p-8">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">Nuestros Planes de Membresía</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Elige el plan perfecto para comenzar tu viaje en el baile con nosotros. Opciones flexibles para cada nivel y objetivo.
          </p>
        </div>

        {isLoading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[450px] w-full" />)}
            </div>
        ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {membershipPlans.map(plan => (
                <PlanCard key={plan.id} plan={plan} onPurchaseRequest={handlePurchaseRequest}/>
              ))}
            </div>
        )}
      </div>
      
      <LoginRequiredDialog isOpen={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />

      <AlertDialog open={!!planToConfirm} onOpenChange={(isOpen) => !isOpen && setPlanToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Compra</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de adquirir el plan "{planToConfirm?.title}" por €{planToConfirm && 'price' in planToConfirm && planToConfirm.price !== undefined ? planToConfirm.price : '0'}. Se generará una factura pendiente en tu perfil. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPlanToConfirm(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPurchase}>Confirmar y Adquirir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedPlan && selectedPlan.accessType === 'custom_pack' && (
        <CustomPackModal
          plan={selectedPlan}
          isOpen={isCustomPackOpen}
          onClose={() => setIsCustomPackOpen(false)}
          onConfirm={handleCustomPackTierSelected}
        />
      )}
    </>
  );
}
