import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { subMonths, isAfter, parseISO, format } from 'date-fns';

interface SpendingAnalyticsProps {
  transactions: Transaction[];
  timeframe: string;
}

export function SpendingAnalytics({ transactions, timeframe }: SpendingAnalyticsProps) {
  const [view, setView] = useState<'category' | 'monthly'>('category');
  
  // Filter transactions by timeframe and type
  const filteredTransactions = React.useMemo(() => {
    try {
      if (!transactions || !transactions.length) return [];
      
      // Only consider expense transactions
      const expenses = transactions.filter(tx => tx.type === 'Expense');
      
      if (!expenses.length) return [];
      
      // Apply timeframe filter
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // all time
          return expenses;
      }
      
      return expenses.filter(tx => {
        if (!tx.date) return false;
        
        try {
          const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
          return isAfter(txDate, startDate) || txDate.getTime() === startDate.getTime();
        } catch (err) {
          console.error("Error parsing date:", tx.date, err);
          return false;
        }
      });
    } catch (err) {
      console.error("Error filtering transactions:", err);
      return [];
    }
  }, [transactions, timeframe]);
  
  // Category spending data
  const categoryData = React.useMemo(() => {
    try {
      if (!filteredTransactions || !filteredTransactions.length) return [];
      
      const categories: Record<string, number> = {};
      
      filteredTransactions.forEach(tx => {
        try {
          const category = tx.category || 'Uncategorized';
          
          if (!categories[category]) {
            categories[category] = 0;
          }
          categories[category] += tx.amount || 0;
        } catch (err) {
          console.error("Error processing transaction for category data:", tx, err);
        }
      });
      
      return Object.entries(categories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    } catch (err) {
      console.error("Error generating category data:", err);
      return [];
    }
  }, [filteredTransactions]);
  
  // Monthly spending data
  const monthlyData = React.useMemo(() => {
    try {
      if (!filteredTransactions || !filteredTransactions.length) return [];
      
      const months: Record<string, number> = {};
      // Last 6 months regardless of timeframe for consistent comparison
      const monthsToShow = 6;
      
      // Initialize last 6 months
      for (let i = 0; i < monthsToShow; i++) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'MMM yyyy');
        months[monthKey] = 0;
      }
      
      // Fill in the data
      filteredTransactions.forEach(tx => {
        if (!tx.date) return;
        
        try {
          const date = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
          const monthKey = format(date, 'MMM yyyy');
          
          if (months[monthKey] !== undefined) {
            months[monthKey] += tx.amount || 0;
          }
        } catch (err) {
          console.error("Error formatting transaction date:", tx.date, err);
        }
      });
      
      return Object.entries(months)
        .map(([name, value]) => ({ name, value }))
        .reverse(); // Chronological order
    } catch (err) {
      console.error("Error generating monthly data:", err);
      return [];
    }
  }, [filteredTransactions]);
  
  const COLORS = ['#7F5539', '#9C6644', '#F8A100', '#FFB733', '#0F766E', '#14B8A6', '#EF4444', '#10B981'];
  
  const renderPieChart = () => (
    <div className="h-[350px]">
      {categoryData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Legend layout="vertical" verticalAlign="middle" align="right" />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">No expense data available</p>
        </div>
      )}
    </div>
  );
  
  const renderBarChart = () => (
    <div className="h-[350px]">
      {monthlyData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={monthlyData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `$${value}`} />
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Bar dataKey="value" name="Expenses" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">No expense data available</p>
        </div>
      )}
    </div>
  );
  
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Spending Analysis</CardTitle>
        <CardDescription>
          Analyze your spending patterns
        </CardDescription>
        <Tabs 
          value={view} 
          onValueChange={(v) => setView(v as 'category' | 'monthly')}
          className="w-full mt-2"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
          </TabsList>
          
          <TabsContent value="category">
            {/* Top spending categories summary */}
            {categoryData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
                {categoryData.slice(0, 3).map((category, index) => (
                  <Card key={index} className="bg-gray-50 border-0">
                    <CardContent className="pt-6">
                      <h3 className="text-gray-600 text-sm">{category.name}</h3>
                      <p className="text-2xl font-semibold mt-1 text-red-500">
                        {formatCurrency(category.value)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {((category.value / categoryData.reduce((sum, cat) => sum + cat.value, 0)) * 100).toFixed(1)}% of total
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {renderPieChart()}
          </TabsContent>
          
          <TabsContent value="monthly">
            {renderBarChart()}
          </TabsContent>
        </Tabs>
      </CardHeader>
      <CardContent>
      </CardContent>
    </Card>
  );
}