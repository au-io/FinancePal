import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@shared/schema';
import { addMonths, format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MonthlyOverviewProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function MonthlyOverview({ transactions, isLoading }: MonthlyOverviewProps) {
  const [period, setPeriod] = useState('6');
  
  // Generate data for the chart
  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    const months = parseInt(period);
    const data = [];
    
    const today = new Date();
    
    // Generate data for each month
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = addMonths(today, -i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthName = format(monthDate, 'MMM');
      
      // Filter transactions for this month
      const monthTransactions = transactions.filter(t => {
        const txDate = parseISO(t.date.toString());
        return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      });
      
      // Calculate income and expenses for the month
      const income = monthTransactions
        .filter(t => t.type === 'Income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter(t => t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      data.push({
        name: monthName,
        Income: income,
        Expenses: expenses,
        Balance: income - expenses
      });
    }
    
    return data;
  }, [transactions, period]);

  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm mb-6">
        <CardHeader className="flex justify-between items-center pb-2">
          <CardTitle className="text-lg font-heading">Monthly Overview</CardTitle>
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm mb-6">
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle className="text-lg font-heading">Monthly Overview</CardTitle>
        <Select
          value={period}
          onValueChange={setPeriod}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Bar dataKey="Income" fill="#10B981" name="Income" />
                <Bar dataKey="Expenses" fill="#EF4444" name="Expenses" />
                <Bar dataKey="Balance" fill="#7F5539" name="Balance" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
