import React, { useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  insertAccountSchema, 
  Account, 
  accountCategories,
  accountIcons,
} from '@shared/schema';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  editingAccount?: Account | null;
  isSubmitting?: boolean;
}

// Extend the schema for the form
const formSchema = insertAccountSchema.extend({});

export function AccountModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingAccount = null,
  isSubmitting = false
}: AccountModalProps) {
  const isEditing = !!editingAccount;

  // Set up form with initial values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: accountCategories[0],
      icon: accountIcons[0],
      balance: 0,
      userId: 0, // Will be set by the server
    },
  });

  // Update form when editing account
  useEffect(() => {
    if (editingAccount) {
      form.reset({
        name: editingAccount.name,
        category: editingAccount.category,
        icon: editingAccount.icon,
        balance: editingAccount.balance,
        userId: 0, // Will be set by the server
      });
    } else {
      form.reset({
        name: '',
        category: accountCategories[0],
        icon: accountIcons[0],
        balance: 0,
        userId: 0,
      });
    }
  }, [editingAccount, form]);

  // Handle form submission
  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading">
            {isEditing ? 'Edit Account' : 'New Account'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Checking Account - Bank Name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Icon</FormLabel>
                  <div className="grid grid-cols-5 gap-2">
                    {accountIcons.map((icon) => (
                      <Button
                        key={icon}
                        type="button"
                        variant={field.value === icon ? "default" : "outline"}
                        className="p-3 h-auto aspect-square"
                        onClick={() => field.onChange(icon)}
                      >
                        <span className="material-icons">{icon}</span>
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
