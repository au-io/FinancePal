import React, { useState, useEffect } from 'react';
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
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  insertTransactionSchema, 
  Account, 
  Transaction, 
  transactionCategories,
  transactionTypes,
  transactionFrequencies 
} from '@shared/schema';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  accounts: Account[];
  editingTransaction?: Transaction | null;
  isSubmitting?: boolean;
}

// Extend the schema for the form
const formSchema = insertTransactionSchema.extend({
  date: z.date(),
  isRecurring: z.boolean(),
});

export function TransactionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  accounts, 
  editingTransaction = null,
  isSubmitting = false
}: TransactionModalProps) {
  const isEditing = !!editingTransaction;
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Set up form with initial values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceAccountId: 0,
      destinationAccountId: undefined,
      amount: 0,
      type: 'Expense',
      category: 'Other',
      description: '',
      date: new Date(),
      isRecurring: false,
      frequency: 'Monthly',
      frequencyDay: 1,
      frequencyCustomDays: 7,
      userId: 0, // Will be set by the server
    },
  });

  // Update form when editing transaction
  useEffect(() => {
    if (editingTransaction) {
      const date = editingTransaction.date 
        ? new Date(editingTransaction.date) 
        : new Date();

      form.reset({
        sourceAccountId: editingTransaction.sourceAccountId,
        destinationAccountId: editingTransaction.destinationAccountId,
        amount: editingTransaction.amount,
        type: editingTransaction.type as any,
        category: editingTransaction.category,
        description: editingTransaction.description || '',
        date,
        isRecurring: editingTransaction.isRecurring || false,
        frequency: editingTransaction.frequency as any || 'Monthly',
        frequencyDay: editingTransaction.frequencyDay || 1,
        frequencyCustomDays: editingTransaction.frequencyCustomDays || 7,
        userId: 0,
      });
      
      setShowRecurringOptions(editingTransaction.isRecurring || false);
    } else {
      form.reset({
        sourceAccountId: accounts.length > 0 ? accounts[0].id : 0,
        destinationAccountId: undefined,
        amount: 0,
        type: 'Expense',
        category: 'Other',
        description: '',
        date: new Date(),
        isRecurring: false,
        frequency: 'Monthly',
        frequencyDay: 1,
        frequencyCustomDays: 7,
        userId: 0,
      });
      setShowRecurringOptions(false);
    }
  }, [editingTransaction, form, accounts]);

  // Handle recurring toggle
  const handleRecurringChange = (value: string) => {
    const isRecurring = value === 'recurring';
    form.setValue('isRecurring', isRecurring);
    setShowRecurringOptions(isRecurring);
  };

  // Handle new category submission
  const handleNewCategorySubmit = () => {
    if (newCategory.trim()) {
      form.setValue('category', newCategory.trim());
      setNewCategory('');
      setShowNewCategoryInput(false);
    }
  };

  // Handle form submission
  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    // Prepare values before submitting
    const submissionValues = {
      ...values,
      // Clear destination account if not a transfer
      destinationAccountId: values.type === 'Transfer' ? values.destinationAccountId : undefined,
      // Clear frequency fields if not recurring
      frequency: values.isRecurring ? values.frequency : undefined,
      frequencyDay: values.isRecurring && values.frequency === 'Monthly' ? values.frequencyDay : undefined,
      frequencyCustomDays: values.isRecurring && values.frequency === 'Custom' ? values.frequencyCustomDays : undefined,
    };
    
    onSubmit(submissionValues);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading">
            {isEditing ? 'Edit Transaction' : 'New Transaction'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <FormControl>
                    <ToggleGroup 
                      type="single" 
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-3 gap-2"
                    >
                      {transactionTypes.map((type) => (
                        <ToggleGroupItem 
                          key={type} 
                          value={type} 
                          className="py-2 px-3 text-center"
                        >
                          {type}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sourceAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('type') === 'Transfer' ? 'From Account' : 'Account'}
                  </FormLabel>
                  <Select 
                    value={field.value.toString()} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Destination account field for transfers */}
            {form.watch('type') === 'Transfer' && (
              <FormField
                control={form.control}
                name="destinationAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Account</FormLabel>
                    <Select 
                      value={field.value?.toString() || '0'} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Select an account</SelectItem>
                        {accounts
                          .filter(account => account.id !== form.watch('sourceAccountId'))
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionCategories.map((category) => (
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
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <div className="space-y-2">
                <RadioGroup 
                  defaultValue="one-time"
                  value={form.watch('isRecurring') ? 'recurring' : 'one-time'}
                  onValueChange={handleRecurringChange}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one-time" id="one-time" />
                    <label htmlFor="one-time">One-time</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id="recurring" />
                    <label htmlFor="recurring">Recurring</label>
                  </div>
                </RadioGroup>
              </div>
            </FormItem>

            {/* Recurring options */}
            {showRecurringOptions && (
              <div className="space-y-4 p-3 bg-gray-50 rounded-lg">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transactionFrequencies.map((frequency) => (
                            <SelectItem key={frequency} value={frequency}>
                              {frequency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('frequency') === 'Monthly' && (
                  <FormField
                    control={form.control}
                    name="frequencyDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Month</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="31" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('frequency') === 'Custom' && (
                  <FormField
                    control={form.control}
                    name="frequencyCustomDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Every X Days</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

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
