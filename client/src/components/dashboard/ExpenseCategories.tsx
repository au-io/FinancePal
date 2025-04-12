import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@shared/schema';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
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

interface ExpenseCategoriesProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function ExpenseCategories({ transactions, isLoading }: ExpenseCategoriesProps) {
  const [timeframe, setTimeframe] = React.useState('month');

  // Filter to only expense transactions
  const expenseTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'Expense');
  }, [transactions]);

  // Get current date for filtering
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter transactions based on selected timeframe
  const filteredTransactions = useMemo(() => {
    return expenseTransactions.filter(t => {
      const txDate = new Date(t.date);
      
      if (timeframe === 'month') {
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      }
      
      if (timeframe === 'quarter') {
        const txQuarter = Math.floor(txDate.getMonth() / 3);
        const currentQuarter = Math.floor(currentMonth / 3);
        return txQuarter === currentQuarter && txDate.getFullYear() === currentYear;
      }
      
      if (timeframe === 'year') {
        return txDate.getFullYear() === currentYear;
      }
      
      return true;
    });
  }, [expenseTransactions, timeframe, currentMonth, currentYear]);

  // Calculate expense categories
  const expenseCategories = useMemo(() => {
    const categories: Record<string, number> = {};
    
    filteredTransactions.forEach(t => {
      if (!categories[t.category]) {
        categories[t.category] = 0;
      }
      categories[t.category] += t.amount;
    });
    
    // Convert to array for the pie chart
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value
    }));
  }, [filteredTransactions]);

  // Calculate the total amount
  const totalAmount = useMemo(() => {
    return expenseCategories.reduce((sum, category) => sum + category.value, 0);
  }, [expenseCategories]);

  // Define chart colors
  const COLORS = ['#7F5539', '#9C6644', '#F8A100', '#FFB733', '#0F766E', '#14B8A6', '#EF4444', '#10B981', '#6B4730', '#F59E0B'];

  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm">
        <CardHeader className="flex justify-between items-center pb-2">
          <CardTitle className="text-lg font-heading">Expense Categories</CardTitle>
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm">
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <CardTitle className="text-lg font-heading">Expense Categories</CardTitle>
        <Select
          value={timeframe}
          onValueChange={setTimeframe}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">No expense data available</p>
          </div>
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-2">
              {expenseCategories.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{category.name}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">${category.value.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {totalAmount > 0 ? Math.round((category.value / totalAmount) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
