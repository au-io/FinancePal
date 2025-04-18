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
import { useCurrency } from '@/hooks/use-currency';
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
import { useCategories } from '@/hooks/use-categories';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
  accounts: Account[];
  editingTransaction?: Transaction | null;
  isSubmitting?: boolean;
  defaultRecurring?: boolean;
}

// Extend the schema for the form
const formSchema = insertTransactionSchema.extend({
  date: z.date(),
  isRecurring: z.boolean(),
  // Enforce type to be one of the transaction types
  type: z.enum(transactionTypes, {
    required_error: "Transaction type is required",
    invalid_type_error: "Transaction type must be Income, Expense, or Transfer"
  }),
});

export function TransactionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  accounts, 
  editingTransaction = null,
  isSubmitting = false,
  defaultRecurring = false
}: TransactionModalProps) {
  const isEditing = !!editingTransaction;
  const { customCategories, addCategory } = useCategories();
  // Get the current currency context
  const { currencySymbol } = useCurrency();
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
      recurringEndDate: undefined,
      userId: 0, // Will be set by the server
    },
  });

  // Update form when editing transaction
  useEffect(() => {
    if (editingTransaction) {
      const date = editingTransaction.date 
        ? new Date(editingTransaction.date) 
        : new Date();

      // Check if recurringEndDate exists and is valid
      let recurringEndDate = undefined;
      if (editingTransaction.recurringEndDate) {
        recurringEndDate = new Date(editingTransaction.recurringEndDate);
      }
      
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
        recurringEndDate,
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
        isRecurring: defaultRecurring,
        frequency: 'Monthly',
        frequencyDay: 1,
        frequencyCustomDays: 7,
        recurringEndDate: undefined,
        userId: 0,
      });
      setShowRecurringOptions(defaultRecurring);
    }
  }, [editingTransaction, form, accounts, defaultRecurring]);

  // Handle recurring toggle
  const handleRecurringChange = (value: string) => {
    const isRecurring = value === 'recurring';
    form.setValue('isRecurring', isRecurring);
    setShowRecurringOptions(isRecurring);
  };

  // Handle new category submission
  const handleNewCategorySubmit = () => {
    if (newCategory.trim()) {
      const formattedCategory = newCategory.trim();
      // Add to global custom categories
      addCategory(formattedCategory);
      // Set form value with the formatted category
      form.setValue('category', formattedCategory);
      // Reset UI state
      setNewCategory('');
      setShowNewCategoryInput(false);
      
      // Force update the form to recognize the change
      form.trigger('category');
    }
  };

  // Handle form submission
  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    // Prepare values before submitting
    const { userId, ...valuesWithoutUserId } = values;
    
    const submissionValues = {
      ...valuesWithoutUserId,
      // Convert Date object to ISO string for server-side parsing
      date: values.date instanceof Date ? values.date.toISOString() : values.date,
      // Clear destination account if not a transfer
      destinationAccountId: values.type === 'Transfer' ? values.destinationAccountId : undefined,
      // Clear frequency fields if not recurring
      frequency: values.isRecurring ? values.frequency : undefined,
      frequencyDay: values.isRecurring && values.frequency === 'Monthly' ? values.frequencyDay : undefined,
      frequencyCustomDays: values.isRecurring && values.frequency === 'Custom' ? values.frequencyCustomDays : undefined,
      // Convert recurringEndDate to ISO string if it exists
      recurringEndDate: values.isRecurring && values.recurringEndDate 
        ? values.recurringEndDate instanceof Date ? values.recurringEndDate.toISOString() : values.recurringEndDate
        : undefined,
    };
    
    onSubmit(submissionValues);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                      value={field.value || 0}
                      onChange={field.onChange}
                      currencySymbol={currencySymbol}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!showNewCategoryInput ? (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setShowNewCategoryInput(true);
                        } else {
                          field.onChange(value);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>System Categories</SelectLabel>
                          {transactionCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        
                        {customCategories.length > 0 && (
                          <>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>Custom Categories</SelectLabel>
                              {customCategories.map((category) => (
                                <SelectItem key={`custom-${category}`} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        )}
                        
                        <SelectSeparator />
                        <SelectItem value="custom">
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Custom Category
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Custom Category</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category name"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleNewCategorySubmit}
                    disabled={!newCategory.trim()}
                  >
                    Add
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategory('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </FormItem>
            )}

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
                    <Input {...field} value={field.value || ''} />
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
                
                {/* End date for recurring transactions */}
                <FormField
                  control={form.control}
                  name="recurringEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
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
                                <span>No end date (runs indefinitely)</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="px-4 py-2 border-b">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium">End Date</h3>
                              {field.value && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => field.onChange(undefined)}
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Select when to stop this recurring transaction
                            </p>
                          </div>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
