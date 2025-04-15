import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Users } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Available currencies
const currencies = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'CNY', name: 'Chinese Yuan (¥)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'BRL', name: 'Brazilian Real (R$)' },
  { code: 'MXN', name: 'Mexican Peso (Mex$)' },
];

// Form schema
const familyFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  currency: z.string().default('GBP'),
});

type FamilyFormData = z.infer<typeof familyFormSchema>;

interface FamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (family: any) => void;
}

export function FamilyModal({ isOpen, onClose, onSuccess }: FamilyModalProps) {
  const { toast } = useToast();
  
  // Form setup
  const form = useForm<FamilyFormData>({
    resolver: zodResolver(familyFormSchema),
    defaultValues: {
      name: '',
      currency: 'GBP',
    },
  });
  
  // Create family mutation
  const createFamilyMutation = useMutation({
    mutationFn: async (data: FamilyFormData) => {
      const res = await apiRequest('POST', '/api/families', data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Family created',
        description: `${data.name} has been created successfully`,
      });
      
      // Invalidate families cache
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      
      // Reset form and close modal
      form.reset();
      onClose();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to create family',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: FamilyFormData) => {
    createFamilyMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create New Family
          </DialogTitle>
          <DialogDescription>
            Create a new family group and set the default currency
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter family name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This will be the default currency for all family accounts and transactions
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="submit"
                disabled={createFamilyMutation.isPending}
              >
                {createFamilyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Family'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}