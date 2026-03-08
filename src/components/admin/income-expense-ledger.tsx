
'use client';
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { Transaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Paperclip, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';

const transactionFormSchema = z.object({
  type: z.enum(['ingreso', 'egreso'], { required_error: "Debes seleccionar un tipo." }),
  category: z.string().min(1, "La categoría es obligatoria."),
  description: z.string().min(3, "La descripción es obligatoria."),
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  receiptUrl: z.any().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export function IncomeExpenseLedger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/transactions');
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
          console.error("Failed to fetch transactions");
        }
      } catch (error) {
        console.error("Error fetching transactions", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'egreso',
      category: '',
      description: '',
      amount: 0,
      date: new Date(),
    }
  });

  const onSubmit = async (data: TransactionFormValues) => {
    const newTransactionData = {
      ...data,
      date: format(data.date, 'yyyy-MM-dd'),
    };
    
    try {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTransactionData)
        });

        if (!res.ok) throw new Error('Failed to save transaction');

        const savedTransaction = await res.json();
        setTransactions(prev => [savedTransaction, ...prev]);

        toast({
          title: "Transacción añadida",
          description: "La transacción ha sido registrada exitosamente."
        });
        setIsDialogOpen(false);
        form.reset();
    } catch (error) {
        toast({ title: "Error", description: "No se pudo guardar la transacción.", variant: "destructive" });
    }
  };

  return (
    <>
        <div className="flex items-center justify-end mb-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Transacción
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Añadir Nueva Transacción</DialogTitle>
                <DialogDescription>
                    Registra un nuevo ingreso o egreso manualmente.
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="ingreso">Ingreso</SelectItem>
                        <SelectItem value="egreso">Egreso</SelectItem>
                        </SelectContent>
                    </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input {...field} placeholder="Ej: Suministros, Alquiler" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Descripción</FormLabel><FormControl><Input {...field} placeholder="Ej: Compra de botellas de agua" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>Monto (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} value={format(field.value, 'yyyy-MM-dd')} onChange={(e) => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="receiptUrl" render={({ field }) => (
                        <FormItem><FormLabel>Recibo (Opcional)</FormLabel><FormControl><Input type="file" {...field} /></FormControl><FormDescription>Adjunta una imagen o PDF del recibo.</FormDescription><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit">Guardar Transacción</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </div>
        <div className="overflow-y-auto h-96">
            <Table>
            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-8 w-3/4" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-1/4 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : (
                    transactions.map((t) => (
                    <TableRow key={t.id}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {t.type === 'ingreso' 
                                    ? <ArrowUpCircle className="h-5 w-5 text-green-500" />
                                    : <ArrowDownCircle className="h-5 w-5 text-red-500" />
                                }
                                <div>
                                    <p className="font-medium">{t.description}</p>
                                    <p className="text-xs text-muted-foreground">{t.category} - {format(parseISO(t.date), 'PPP', { locale: es })}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${t.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'ingreso' ? '+' : '-'}€{t.amount.toFixed(2)}
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
    </>
  );
}
