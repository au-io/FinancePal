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
  
  // Get transactions for the selected date
  const dayTransactions = React.useMemo(() => {
    if (!transactions || !selectedDate) return [];
    
    return transactions.filter(tx => {
      const txDate = parseISO(tx.date.toString());
      return isSameDay(txDate, selectedDate);
    }).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Sort by date descending
    });
  }, [transactions, selectedDate]);
  
  // Calculate totals for the selected date
  const dayTotals = React.useMemo(() => {
    if (!dayTransactions.length) {
      return { income: 0, expenses: 0, net: 0 };
    }
    
    const income = dayTransactions
      .filter(tx => tx.type === 'Income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const expenses = dayTransactions
      .filter(tx => tx.type === 'Expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      income,
      expenses,
      net: income - expenses
    };
  }, [dayTransactions]);

  // Generate calendar day modifiers to highlight days with transactions
  const dayWithTransactionsModifier = React.useMemo(() => {
    if (!transactions) return {};
    
    const daysWithIncome = new Set();
    const daysWithExpenses = new Set();
    const daysWithBoth = new Set();
    
    transactions.forEach(tx => {
      const txDate = parseISO(tx.date.toString());
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
    });
    
    return {
      income: (date: Date) => daysWithIncome.has(date.toDateString()),
      expense: (date: Date) => daysWithExpenses.has(date.toDateString()),
      both: (date: Date) => daysWithBoth.has(date.toDateString()),
    };
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
