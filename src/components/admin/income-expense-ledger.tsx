
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
import { PlusCircle, Paperclip, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';

const transactionFormSchema = z.object({
  type: z.enum(['ingreso', 'egreso'], { required_error: "Debes seleccionar un tipo." }),
  category: z.string().min(1, "La categoría es obligatoria."),
  description: z.string().min(3, "La descripción es obligatoria."),
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  date: z.string({ required_error: "La fecha es obligatoria." }),

});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export function IncomeExpenseLedger({ transactions: initialTransactions }: { transactions?: Transaction[] }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions || []);
  const [isLoading, setIsLoading] = useState(!initialTransactions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialTransactions) {
      setTransactions([...initialTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsLoading(false);
      return;
    }

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
  }, [initialTransactions]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'egreso',
      category: '',
      description: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const handleEdit = (t: Transaction) => {
    setSelectedTransaction(t);
    form.reset({
      type: t.type as 'ingreso' | 'egreso',
      category: t.category,
      description: t.description,
      amount: t.amount,
      date: format(parseISO(t.date), 'yyyy-MM-dd'),
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedTransaction(null);
    form.reset({
      type: 'egreso',
      category: '',
      description: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta transacción?')) return;
    
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete transaction');

      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({ title: "Transacción eliminada" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la transacción.", variant: "destructive" });
    }
  };

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      const method = selectedTransaction ? 'PUT' : 'POST';
      const url = selectedTransaction ? `/api/transactions/${selectedTransaction.id}` : '/api/transactions';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('Failed to save transaction');

      const savedTransaction = await res.json();
      
      if (selectedTransaction) {
        setTransactions(prev => prev.map(t => t.id === savedTransaction.id ? savedTransaction : t));
      } else {
        setTransactions(prev => [savedTransaction, ...prev]);
      }

      toast({
        title: selectedTransaction ? "Transacción actualizada" : "Transacción añadida",
        description: `La transacción ha sido ${selectedTransaction ? 'actualizada' : 'registrada'} exitosamente.`
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedTransaction(null);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar la transacción.", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setSelectedTransaction(null);
        }}>
            <Button size="sm" onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Transacción
            </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTransaction ? 'Editar Transacción' : 'Añadir Nueva Transacción'}</DialogTitle>
              <DialogDescription>
                {selectedTransaction ? 'Modifica los detalles de la transacción registrada.' : 'Registra un nuevo ingreso o egreso manualmente.'}
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
                  <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => { setIsDialogOpen(false); setSelectedTransaction(null); }}>Cancelar</Button>
                  <Button type="submit">{selectedTransaction ? 'Actualizar' : 'Guardar'} Transacción</Button>
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
              <TableHead className="text-right w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-1/4 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-full" /></TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
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
