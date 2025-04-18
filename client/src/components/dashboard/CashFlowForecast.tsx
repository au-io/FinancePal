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
    
    // Track cumulative income and expenses for trending
    let cumulativeIncome = 0;
    let cumulativeExpenses = 0;
    
    // Create data points for each day
    for (let i = 0; i <= 30; i++) {
      const date = addDays(today, i);
      
      // Find recurring transactions due on this date
      const dayRecurringTransactions = transactions.filter(tx => {
        if (!tx.isRecurring) return false;
        
        const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
        
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
          return daysSinceStart % interval === 0 && daysSinceStart >= 0;
        }
        
        return false;
      });
      
      // Find one-time transactions scheduled for this date
      const oneTimeTransactions = transactions.filter(tx => {
        if (tx.isRecurring) return false;
        
        try {
          const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
          return isSameDay(date, txDate) && date >= today;
        } catch (err) {
          console.error("Error parsing one-time transaction date:", tx, err);
          return false;
        }
      });
      
      // Combine all transactions for this day
      const allDayTransactions = [...dayRecurringTransactions, ...oneTimeTransactions];
      
      // Calculate day's income and expenses
      const dayIncome = allDayTransactions
        .filter(tx => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const dayExpenses = allDayTransactions
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      // Update running balance
      currentBalance += (dayIncome - dayExpenses);
      
      // Track cumulative totals for trending visualization
      cumulativeIncome += dayIncome;
      cumulativeExpenses += dayExpenses;
      
      // Calculate projected recurring income and expenses for smoothed trend line
      // This helps visualize recurring transaction trends even on days without transactions
      const avgDailyIncome = i === 0 ? 0 : cumulativeIncome / (i + 1);
      const avgDailyExpense = i === 0 ? 0 : cumulativeExpenses / (i + 1);
      
      // Create cumulative trend lines that show expected values over time
      const displayIncome = i === 0 ? dayIncome : (dayIncome > 0 ? dayIncome : avgDailyIncome * 0.5);
      const displayExpenses = i === 0 ? dayExpenses : (dayExpenses > 0 ? dayExpenses : avgDailyExpense * 0.5);
      
      // Add data point with all calculated values
      data.push({
        date: format(date, 'MMM dd'),
        balance: currentBalance,
        income: displayIncome,
        expenses: displayExpenses,
        // Save actual values for tooltip display
        actualIncome: dayIncome,
        actualExpenses: dayExpenses,
        // Include transaction count for the day
        transactionCount: allDayTransactions.length
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
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-md shadow-md">
                          <p className="font-medium mb-1">{label}</p>
                          <div className="text-sm space-y-1">
                            <p className="text-[#7F5539]">
                              <span className="font-medium">Balance:</span> {formatCurrency(dataPoint.balance)}
                            </p>
                            <p className="text-green-500">
                              <span className="font-medium">Income:</span> {formatCurrency(dataPoint.actualIncome)}
                              {dataPoint.transactionCount > 0 && dataPoint.actualIncome > 0 && (
                                <span className="ml-1 text-xs text-gray-500">
                                  (Transactions)
                                </span>
                              )}
                            </p>
                            <p className="text-red-500">
                              <span className="font-medium">Expenses:</span> {formatCurrency(dataPoint.actualExpenses)}
                              {dataPoint.transactionCount > 0 && dataPoint.actualExpenses > 0 && (
                                <span className="ml-1 text-xs text-gray-500">
                                  (Transactions)
                                </span>
                              )}
                            </p>
                            {dataPoint.transactionCount > 0 && (
                              <p className="text-gray-500 text-xs">
                                {dataPoint.transactionCount} transaction{dataPoint.transactionCount !== 1 ? 's' : ''} on this day
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
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
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10B981"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="Expected Income"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="Expected Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
