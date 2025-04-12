import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction, Account } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { addDays, format, isWithinInterval, isSameDay, parseISO } from 'date-fns';

interface CashFlowForecastProps {
  transactions: Transaction[];
  accounts: Account[];
  isLoading: boolean;
}

export function CashFlowForecast({ transactions, accounts, isLoading }: CashFlowForecastProps) {
  // Generate forecast data for the next 30 days
  const forecastData = React.useMemo(() => {
    if (!transactions.length || !accounts.length) return [];
    
    const today = new Date();
    const endDate = addDays(today, 30);
    const data = [];
    
    // Start with current account balances
    let currentBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    
    // Create data points for each day
    for (let i = 0; i <= 30; i++) {
      const date = addDays(today, i);
      
      // Find recurring transactions due on this date
      const dayTransactions = transactions.filter(tx => {
        if (!tx.isRecurring) return false;
        
        const txDate = parseISO(tx.date.toString());
        
        if (tx.frequency === 'Monthly' && tx.frequencyDay) {
          // Monthly recurring on specific day
          return date.getDate() === tx.frequencyDay;
        } else if (tx.frequency === 'Yearly') {
          // Yearly recurring on same date
          return date.getDate() === txDate.getDate() && date.getMonth() === txDate.getMonth();
        } else if (tx.frequency === 'Custom' && tx.frequencyCustomDays) {
          // Custom recurring on interval
          const interval = tx.frequencyCustomDays;
          const daysSinceStart = Math.floor((date.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceStart % interval === 0;
        }
        
        return false;
      });
      
      // Find one-time transactions scheduled for this date
      const oneTimeTransactions = transactions.filter(tx => {
        if (tx.isRecurring) return false;
        const txDate = parseISO(tx.date.toString());
        return isSameDay(date, txDate) && date >= today;
      });
      
      // Combine all transactions for this day
      const allDayTransactions = [...dayTransactions, ...oneTimeTransactions];
      
      // Calculate day's income and expenses
      const dayIncome = allDayTransactions
        .filter(tx => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const dayExpenses = allDayTransactions
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      // Update running balance
      currentBalance += (dayIncome - dayExpenses);
      
      // Add data point
      data.push({
        date: format(date, 'MMM dd'),
        balance: currentBalance,
        income: dayIncome,
        expenses: dayExpenses,
      });
    }
    
    return data;
  }, [transactions, accounts]);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Cash Flow Forecast</CardTitle>
        <CardDescription>30-day projection based on recurring transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg animate-pulse" />
        ) : forecastData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">Not enough data for forecast</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={forecastData}
                margin={{
                  top: 5,
                  right: 20,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value as number)} 
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#7F5539"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                  name="Projected Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
