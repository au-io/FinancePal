import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction, Account } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { addDays, addMonths, format, isWithinInterval, isSameDay, parseISO, subMonths, isAfter, isBefore } from 'date-fns';
import { transactionCategories } from '@shared/schema';

interface CategoryExpenseForecastProps {
  transactions: Transaction[];
  isLoading: boolean;
}

// Generate consistent colors for each category
const categoryColors: Record<string, string> = {};
const baseColors = [
  '#2563EB', // Blue
  '#DB2777', // Pink
  '#16A34A', // Green
  '#9333EA', // Purple
  '#EAB308', // Yellow
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#6B7280', // Gray
];

// Assign colors to categories
[...transactionCategories, 'Other'].forEach((category, index) => {
  categoryColors[category] = baseColors[index % baseColors.length];
});

export function CategoryExpenseForecast({ transactions, isLoading }: CategoryExpenseForecastProps) {
  // Generate forecast data for the next 6 months by category
  const forecastData = React.useMemo(() => {
    if (!transactions.length) return [];
    
    const today = new Date();
    const monthLabels = [];
    const categoryData: Record<string, number[]> = {};
    
    // Initialize month labels for the next 6 months
    for (let i = 0; i < 6; i++) {
      const monthDate = addMonths(today, i);
      monthLabels.push(format(monthDate, 'MMM yyyy'));
    }
    
    // Get transactions from past 6 months to analyze patterns
    const sixMonthsAgo = subMonths(today, 6);
    
    // Get all unique categories from all expense transactions
    const allCategories = new Set<string>();
    transactions.forEach(tx => {
      if (tx.type === 'Expense' && tx.category) {
        allCategories.add(tx.category);
      }
    });
    
    // Initialize category data for each month
    allCategories.forEach(category => {
      categoryData[category] = Array(6).fill(0);
    });
    
    // Add special "Other" category for uncategorized expenses
    categoryData['Other'] = Array(6).fill(0);
    
    // Process recurring transactions - these are predictable for the future
    const recurringTransactions = transactions.filter(tx => tx.isRecurring && tx.type === 'Expense');
    
    // For each recurring transaction, project into the future for 6 months
    recurringTransactions.forEach(tx => {
      const startDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
      const category = tx.category || 'Other';
      
      // Use correct end date or default to 6 months from now if not set
      const endDate = tx.recurringEndDate 
        ? (tx.recurringEndDate instanceof Date ? tx.recurringEndDate : parseISO(String(tx.recurringEndDate)))
        : addMonths(today, 6);
      
      // Process based on frequency
      for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
        const currentMonth = addMonths(today, monthIndex);
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        // Skip if transaction end date is before this month
        if (endDate < monthStart) continue;
        
        // Calculate occurrences in this month based on frequency
        let occurrences = 0;
        
        if (tx.frequency === 'Monthly') {
          // Monthly transactions: once per month if day exists in month
          const targetDay = tx.frequencyDay || startDate.getDate();
          const daysInMonth = monthEnd.getDate();
          
          // Check if the target day exists in this month
          if (targetDay <= daysInMonth) {
            occurrences = 1;
          }
        } 
        else if (tx.frequency === 'Yearly') {
          // Yearly transactions: only once if month matches
          if (startDate.getMonth() === currentMonth.getMonth()) {
            occurrences = 1;
          }
        }
        else if (tx.frequency === 'Custom' && tx.frequencyCustomDays) {
          // Custom frequency based on days
          const daysBetween = tx.frequencyCustomDays;
          
          // This is a simplification - in real scenarios you'd need more complex logic
          // to determine exact occurrences based on the custom cycle
          const daysInMonth = monthEnd.getDate();
          occurrences = Math.floor(daysInMonth / daysBetween);
        }
        
        // Add to the category total for this month
        if (categoryData[category]) {
          categoryData[category][monthIndex] += tx.amount * occurrences;
        } else {
          categoryData['Other'][monthIndex] += tx.amount * occurrences;
        }
      }
    });
    
    // Process non-recurring transactions to find patterns
    const nonRecurringByCategory: Record<string, number[]> = {};
    const pastExpenseTransactions = transactions.filter(tx => 
      tx.type === 'Expense' && 
      !tx.isRecurring && 
      isAfter(tx.date instanceof Date ? tx.date : parseISO(String(tx.date)), sixMonthsAgo)
    );
    
    // Group past non-recurring transactions by category and by month
    pastExpenseTransactions.forEach(tx => {
      const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
      const category = tx.category || 'Other';
      const monthsAgo = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      // Initialize if not exists
      if (!nonRecurringByCategory[category]) {
        nonRecurringByCategory[category] = Array(6).fill(0);
      }
      
      // Only consider transactions within past 6 months
      if (monthsAgo >= 0 && monthsAgo < 6) {
        nonRecurringByCategory[category][monthsAgo] += tx.amount;
      }
    });
    
    // Calculate average monthly expenses by category (from most recent 3 months)
    Object.keys(nonRecurringByCategory).forEach(category => {
      const last3MonthsSum = nonRecurringByCategory[category].slice(0, 3).reduce((sum, val) => sum + val, 0);
      const avgMonthlyExpense = last3MonthsSum / 3;
      
      // Project this average into future months
      for (let i = 0; i < 6; i++) {
        // Apply some randomness to make it more realistic
        // Lower values in far-future months (less certainty)
        const certaintyFactor = 1 - (i * 0.05); // 100%, 95%, 90%, 85%, 80%, 75%
        const projectedAmount = avgMonthlyExpense * certaintyFactor;
        
        if (categoryData[category]) {
          categoryData[category][i] += projectedAmount;
        } else {
          categoryData['Other'][i] += projectedAmount;
        }
      }
    });
    
    // Remove categories with no projected expenses
    Object.keys(categoryData).forEach(category => {
      const hasExpenses = categoryData[category].some(amount => amount > 0);
      if (!hasExpenses) {
        delete categoryData[category];
      }
    });
    
    // Convert to the format needed by the chart
    const result = monthLabels.map((month, index) => {
      const monthData: Record<string, any> = { month };
      
      // Add data for each category
      Object.keys(categoryData).forEach(category => {
        monthData[category] = Math.round(categoryData[category][index]);
      });
      
      return monthData;
    });
    
    return result;
  }, [transactions]);

  // Create array of categories found in the data for the chart
  const categories = React.useMemo(() => {
    if (!forecastData.length) return [];
    
    const firstMonth = forecastData[0];
    return Object.keys(firstMonth).filter(key => key !== 'month');
  }, [forecastData]);
  
  return (
    <Card className="bg-white">
      <CardHeader className="space-y-1">
        <CardTitle>Expense Category Forecast</CardTitle>
        <CardDescription>6-month projection of expenses by category</CardDescription>
        <p className="text-xs text-muted-foreground">
          Based on recurring transactions and historical spending patterns
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg animate-pulse" />
        ) : forecastData.length === 0 || categories.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-gray-500">Not enough expense data for category forecast</p>
          </div>
        ) : (
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={forecastData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 100,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  label={{ 
                    value: 'Month', 
                    position: 'insideBottom', 
                    offset: -10,
                    style: { textAnchor: 'middle' } 
                  }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${value}`}
                  label={{ 
                    value: 'Projected Expenses', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' } 
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      let total = 0;
                      payload.forEach(p => { total += (p.value as number) || 0; });
                      
                      return (
                        <div className="bg-white p-3 border rounded-md shadow-md">
                          <p className="font-medium mb-2">{label}</p>
                          <div className="text-sm space-y-1 max-h-[250px] overflow-y-auto">
                            {payload.map((entry, index) => {
                              const value = (entry.value as number) || 0;
                              const percentage = Math.round((value / total) * 100);
                              
                              return (
                                <div key={index} className="flex items-center justify-between gap-4">
                                  <div className="flex items-center">
                                    <div 
                                      className="w-3 h-3 rounded-full mr-2" 
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span>{entry.name}: </span>
                                  </div>
                                  <div className="font-medium">
                                    {formatCurrency(value)} 
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({percentage}%)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="border-t mt-2 pt-2 font-medium flex justify-between">
                              <span>Total:</span>
                              <span>{formatCurrency(total)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ marginTop: 20, paddingTop: 10 }}
                />
                {categories.map((category) => (
                  <Bar 
                    key={category} 
                    dataKey={category} 
                    name={category}
                    stackId="a" 
                    fill={categoryColors[category] || '#8884d8'}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}