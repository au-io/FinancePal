import React, { useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isValid, 
  eachDayOfInterval,
  isSameMonth,
  isWithinInterval,
  getDate,
  parseISO
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useCurrency } from '@/hooks/use-currency';
import { Skeleton } from '@/components/ui/skeleton';
import { Transaction as SchemaTransaction } from '@shared/schema';

// Extend the Transaction type to include the isRecurringInstance property
interface Transaction extends SchemaTransaction {
  isRecurringInstance?: boolean;
}

interface CurrentMonthDailyTransactionsProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function CurrentMonthDailyTransactions({ 
  transactions, 
  isLoading 
}: CurrentMonthDailyTransactionsProps) {
  const { currencySymbol } = useCurrency();
  
  // Generate recurrences for the current month
  const generateRecurrences = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const recurringTransactions: Transaction[] = [];
    
    // Get all recurring transactions
    const recurringOriginals = transactions.filter(tx => 
      tx.isRecurring && tx.frequency
    );
    
    // Process each recurring transaction
    recurringOriginals.forEach(tx => {
      // Original transaction date
      const originalDate = new Date(tx.date);
      
      // Skip if original date is already in current month
      if (isSameMonth(originalDate, now)) {
        return;
      }
      
      // Check if recurring end date exists and is before current month
      if (tx.recurringEndDate && new Date(tx.recurringEndDate) < monthStart) {
        return;
      }
      
      // Monthly recurrences
      if (tx.frequency === 'Monthly' && tx.frequencyDay) {
        // Find the day in current month that matches frequency day
        const matchingDay = daysInMonth.find(day => getDate(day) === tx.frequencyDay);
        
        if (matchingDay) {
          // Create a new transaction instance for this month
          recurringTransactions.push({
            ...tx,
            date: matchingDay,
            id: -1 * recurringTransactions.length - 1, // Generate a unique negative ID
            isRecurringInstance: true
          } as any);
        }
      }
      
      // Yearly recurrences
      else if (tx.frequency === 'Yearly') {
        const txMonth = originalDate.getMonth();
        const txDay = originalDate.getDate();
        
        // Check if original tx month is the current month
        if (txMonth === now.getMonth()) {
          const matchingDay = daysInMonth.find(day => getDate(day) === txDay);
          
          if (matchingDay) {
            recurringTransactions.push({
              ...tx,
              date: matchingDay,
              id: -1 * recurringTransactions.length - 1,
              isRecurringInstance: true
            } as any);
          }
        }
      }
      
      // Custom day frequency
      else if (tx.frequency === 'Custom' && tx.frequencyCustomDays) {
        // Calculate potential recurrence dates
        let currentDate = new Date(originalDate);
        
        // Keep adding the custom interval until we go past the end of the current month
        while (currentDate <= monthEnd) {
          // Add the custom days interval
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + tx.frequencyCustomDays);
          
          // If the date falls within the current month, add it
          if (isWithinInterval(currentDate, { start: monthStart, end: monthEnd })) {
            recurringTransactions.push({
              ...tx,
              date: new Date(currentDate),
              id: -1 * recurringTransactions.length - 1,
              isRecurringInstance: true
            } as any);
          }
        }
      }
    });
    
    return recurringTransactions;
  }, [transactions]);
  
  const currentMonth = useMemo(() => {
    // Get current month's data only
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Filter for current month only from regular transactions
    const regularTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return isValid(txDate) && txDate >= monthStart && txDate <= monthEnd;
    });
    
    // Return combined regular and recurring transactions for current month
    return [...regularTransactions, ...generateRecurrences];
  }, [transactions, generateRecurrences]);
  
  const chartData = useMemo(() => {
    const dailyData = new Map();
    
    // Group by day of month, separate income and expenses
    currentMonth.forEach(tx => {
      const day = format(new Date(tx.date), 'd'); // get day of month (1-31)
      
      if (!dailyData.has(day)) {
        dailyData.set(day, { day, income: 0, expense: 0 });
      }
      
      const entry = dailyData.get(day);
      
      if (tx.type === 'Income') {
        entry.income += tx.amount;
      } else if (tx.type === 'Expense') {
        entry.expense += tx.amount;
      }
    });
    
    // Convert map to array and sort by day
    return Array.from(dailyData.values())
      .sort((a, b) => parseInt(a.day) - parseInt(b.day));
  }, [currentMonth]);

  // Calculate total income and expenses for the month
  const totals = useMemo(() => {
    return {
      income: currentMonth
        .filter(tx => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0),
      expense: currentMonth
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0)
    };
  }, [currentMonth]);
  
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card className="col-span-1 shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Current Month Daily Transactions</CardTitle>
        <CardDescription>
          Income and expenses by day for {format(new Date(), 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4 text-sm">
          <div>
            <span className="font-medium text-green-600">Income:</span> {formatCurrency(totals.income)}
          </div>
          <div>
            <span className="font-medium text-red-600">Expenses:</span> {formatCurrency(totals.expense)}
          </div>
          <div>
            <span className="font-medium">Net:</span> {formatCurrency(totals.income - totals.expense)}
          </div>
        </div>
        
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="day" 
                label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tickFormatter={(value) => `${currencySymbol}${value}`}
              />
              <Tooltip 
                formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, '']}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#000" />
              <Bar dataKey="income" name="Income" fill="#4ade80" />
              <Bar dataKey="expense" name="Expense" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}