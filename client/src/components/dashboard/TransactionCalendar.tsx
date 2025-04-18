import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction } from '@shared/schema';
import { Calendar } from '@/components/ui/calendar';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addDays, isSameDay, parseISO, format } from 'date-fns';

interface TransactionCalendarProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function TransactionCalendar({ transactions, isLoading }: TransactionCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Get transactions for the selected date (including recurring ones)
  const dayTransactions = React.useMemo(() => {
    try {
      if (!transactions || !selectedDate) return [];
      
      // Get one-time transactions on the selected date
      const oneTimeTransactions = transactions.filter(tx => {
        if (!tx || !tx.date) return false;
        
        try {
          // Only include non-recurring transactions matching the exact date
          if (tx.isRecurring) return false;
          
          const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
          return isSameDay(txDate, selectedDate);
        } catch (err) {
          console.error("Error parsing transaction date:", tx.date, err);
          return false;
        }
      });
      
      // Get recurring transactions that would occur on the selected date
      const recurringTransactions = transactions.filter(tx => {
        if (!tx || !tx.date || !tx.isRecurring) return false;
        
        try {
          const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
          
          // Check if the recurring transaction occurs on the selected date
          if (tx.frequency === 'Monthly' && tx.frequencyDay) {
            // Monthly on a specific day
            return selectedDate.getDate() === tx.frequencyDay;
          } else if (tx.frequency === 'Yearly') {
            // Yearly on the same date
            return selectedDate.getDate() === txDate.getDate() && 
                   selectedDate.getMonth() === txDate.getMonth();
          } else if (tx.frequency === 'Custom' && tx.frequencyCustomDays) {
            // Custom days interval
            const daysDiff = Math.floor(
              (selectedDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysDiff % tx.frequencyCustomDays === 0 && daysDiff >= 0;
          }
          
          return false;
        } catch (err) {
          console.error("Error processing recurring transaction:", tx, err);
          return false;
        }
      });
      
      // Combine and sort all transactions
      return [...oneTimeTransactions, ...recurringTransactions].sort((a, b) => {
        try {
          // Mark recurring transactions with an indicator in the description
          if (a.isRecurring && !a.description?.includes('(Recurring)')) {
            a.description = a.description ? `${a.description} (Recurring)` : 'Recurring Transaction';
          }
          if (b.isRecurring && !b.description?.includes('(Recurring)')) {
            b.description = b.description ? `${b.description} (Recurring)` : 'Recurring Transaction';
          }
          
          // Sort by transaction type (Income first, then Expense, then Transfer)
          const typeOrder = { 'Income': 0, 'Expense': 1, 'Transfer': 2 };
          const typeA = typeOrder[a.type as keyof typeof typeOrder] || 3;
          const typeB = typeOrder[b.type as keyof typeof typeOrder] || 3;
          
          if (typeA !== typeB) {
            return typeA - typeB;
          }
          
          // Then sort by amount (descending)
          return b.amount - a.amount;
        } catch (err) {
          console.error("Error sorting transactions:", err);
          return 0;
        }
      });
    } catch (err) {
      console.error("Error getting day transactions:", err);
      return [];
    }
  }, [transactions, selectedDate]);
  
  // Calculate totals for the selected date
  const dayTotals = React.useMemo(() => {
    try {
      if (!dayTransactions || !dayTransactions.length) {
        return { income: 0, expenses: 0, net: 0 };
      }
      
      const income = dayTransactions
        .filter(tx => tx && tx.type === 'Income')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
      const expenses = dayTransactions
        .filter(tx => tx && tx.type === 'Expense')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
      return {
        income,
        expenses,
        net: income - expenses
      };
    } catch (err) {
      console.error("Error calculating day totals:", err);
      return { income: 0, expenses: 0, net: 0 };
    }
  }, [dayTransactions]);

  // Generate calendar day modifiers to highlight days with transactions (including recurring ones)
  const dayWithTransactionsModifier = React.useMemo(() => {
    try {
      if (!transactions || !Array.isArray(transactions)) return {
        income: () => false,
        expense: () => false,
        both: () => false
      };
      
      const daysWithIncome = new Set<string>();
      const daysWithExpenses = new Set<string>();
      const daysWithBoth = new Set<string>();
      
      // Process one-time transactions
      transactions.forEach(tx => {
        try {
          if (!tx || !tx.date || !tx.type || tx.isRecurring) return;
          
          const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
          const dateStr = txDate.toDateString();
          
          if (tx.type === 'Income') {
            if (daysWithExpenses.has(dateStr)) {
              daysWithBoth.add(dateStr);
              daysWithExpenses.delete(dateStr);
              daysWithIncome.delete(dateStr);
            } else if (!daysWithBoth.has(dateStr)) {
              daysWithIncome.add(dateStr);
            }
          } else if (tx.type === 'Expense') {
            if (daysWithIncome.has(dateStr)) {
              daysWithBoth.add(dateStr);
              daysWithExpenses.delete(dateStr);
              daysWithIncome.delete(dateStr);
            } else if (!daysWithBoth.has(dateStr)) {
              daysWithExpenses.add(dateStr);
            }
          }
        } catch (err) {
          console.error("Error processing transaction date for calendar:", tx, err);
        }
      });
      
      // Project recurring transactions 90 days into the future
      const today = new Date();
      const futureDate = addDays(today, 90);
      
      // Process recurring transactions
      transactions.filter(tx => tx.isRecurring).forEach(tx => {
        try {
          if (!tx || !tx.date || !tx.type) return;
          
          const startDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
          
          // Calculate occurrences based on frequency
          if (tx.frequency === 'Monthly' && tx.frequencyDay) {
            // Monthly recurring on a specific day
            for (let i = 0; i < 3; i++) { // Project for 3 months
              const occurrenceDate = new Date(today.getFullYear(), today.getMonth() + i, tx.frequencyDay);
              if (occurrenceDate >= today && occurrenceDate <= futureDate) {
                const dateStr = occurrenceDate.toDateString();
                
                if (tx.type === 'Income') {
                  if (daysWithExpenses.has(dateStr)) {
                    daysWithBoth.add(dateStr);
                    daysWithExpenses.delete(dateStr);
                    daysWithIncome.delete(dateStr);
                  } else if (!daysWithBoth.has(dateStr)) {
                    daysWithIncome.add(dateStr);
                  }
                } else if (tx.type === 'Expense') {
                  if (daysWithIncome.has(dateStr)) {
                    daysWithBoth.add(dateStr);
                    daysWithExpenses.delete(dateStr);
                    daysWithIncome.delete(dateStr);
                  } else if (!daysWithBoth.has(dateStr)) {
                    daysWithExpenses.add(dateStr);
                  }
                }
              }
            }
          } else if (tx.frequency === 'Yearly') {
            // Yearly recurring
            const nextOccurrence = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
            if (nextOccurrence < today) {
              nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
            }
            
            if (nextOccurrence <= futureDate) {
              const dateStr = nextOccurrence.toDateString();
              
              if (tx.type === 'Income') {
                if (daysWithExpenses.has(dateStr)) {
                  daysWithBoth.add(dateStr);
                  daysWithExpenses.delete(dateStr);
                  daysWithIncome.delete(dateStr);
                } else if (!daysWithBoth.has(dateStr)) {
                  daysWithIncome.add(dateStr);
                }
              } else if (tx.type === 'Expense') {
                if (daysWithIncome.has(dateStr)) {
                  daysWithBoth.add(dateStr);
                  daysWithExpenses.delete(dateStr);
                  daysWithIncome.delete(dateStr);
                } else if (!daysWithBoth.has(dateStr)) {
                  daysWithExpenses.add(dateStr);
                }
              }
            }
          } else if (tx.frequency === 'Custom' && tx.frequencyCustomDays) {
            // Custom interval in days
            const interval = tx.frequencyCustomDays;
            let nextDate = new Date(startDate);
            
            // Find the next occurrence after today
            while (nextDate < today) {
              nextDate = addDays(nextDate, interval);
            }
            
            // Project future occurrences within 90 days
            while (nextDate <= futureDate) {
              const dateStr = nextDate.toDateString();
              
              if (tx.type === 'Income') {
                if (daysWithExpenses.has(dateStr)) {
                  daysWithBoth.add(dateStr);
                  daysWithExpenses.delete(dateStr);
                  daysWithIncome.delete(dateStr);
                } else if (!daysWithBoth.has(dateStr)) {
                  daysWithIncome.add(dateStr);
                }
              } else if (tx.type === 'Expense') {
                if (daysWithIncome.has(dateStr)) {
                  daysWithBoth.add(dateStr);
                  daysWithExpenses.delete(dateStr);
                  daysWithIncome.delete(dateStr);
                } else if (!daysWithBoth.has(dateStr)) {
                  daysWithExpenses.add(dateStr);
                }
              }
              
              nextDate = addDays(nextDate, interval);
            }
          }
        } catch (err) {
          console.error("Error projecting recurring transaction:", tx, err);
        }
      });
      
      return {
        income: (date: Date) => date && daysWithIncome.has(date.toDateString()),
        expense: (date: Date) => date && daysWithExpenses.has(date.toDateString()),
        both: (date: Date) => date && daysWithBoth.has(date.toDateString()),
      };
    } catch (err) {
      console.error("Error generating calendar day modifiers:", err);
      return {
        income: () => false,
        expense: () => false,
        both: () => false
      };
    }
  }, [transactions]);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Transaction Calendar</CardTitle>
        <CardDescription>View your daily transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <style jsx global>{`
              .income-day {
                position: relative;
              }
              .income-day::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #10B981;
              }
              .expense-day {
                position: relative;
              }
              .expense-day::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #EF4444;
              }
              .both-day {
                position: relative;
              }
              .both-day::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: linear-gradient(135deg, #10B981 50%, #EF4444 50%);
              }
            `}</style>
            
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                income: dayWithTransactionsModifier.income,
                expense: dayWithTransactionsModifier.expense,
                both: dayWithTransactionsModifier.both,
              }}
              modifiersClassNames={{
                income: 'income-day',
                expense: 'expense-day',
                both: 'both-day',
              }}
              className="rounded-md border"
            />
          </div>
          
          <div className="flex-1">
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 p-2 rounded-md">
                  <p className="text-xs text-gray-500">Income</p>
                  <p className="text-green-500 font-medium">{formatCurrency(dayTotals.income)}</p>
                </div>
                <div className="bg-red-50 p-2 rounded-md">
                  <p className="text-xs text-gray-500">Expenses</p>
                  <p className="text-red-500 font-medium">{formatCurrency(dayTotals.expenses)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-md">
                  <p className="text-xs text-gray-500">Net</p>
                  <p className={`font-medium ${dayTotals.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(dayTotals.net)}
                  </p>
                </div>
              </div>
            </div>
            
            <h3 className="text-sm font-medium mb-2">Transactions</h3>
            {dayTransactions.length === 0 ? (
              <p className="text-gray-500 text-sm py-2">No transactions on this date</p>
            ) : (
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {dayTransactions.map((tx) => (
                    <div key={tx.id} className="p-2 border rounded-md flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{tx.description || tx.category}</p>
                        <p className="text-xs text-gray-500">{tx.category}</p>
                      </div>
                      <p className={`font-medium ${
                        tx.type === 'Income' ? 'text-green-500' : 
                        tx.type === 'Expense' ? 'text-red-500' : ''
                      }`}>
                        {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
