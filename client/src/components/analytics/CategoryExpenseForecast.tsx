import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction, Account } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { addDays, addMonths, format, isWithinInterval, isSameDay, parseISO, subMonths, isAfter, isBefore } from 'date-fns';
import { transactionCategories } from '@shared/schema';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Settings2, Check } from 'lucide-react';

interface CategoryExpenseForecastProps {
  transactions: Transaction[];
  isLoading: boolean;
}

// Generate visually distinct colors for each category
const categoryColors: Record<string, string> = {};
const baseColors = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#22C55E', // Green
  '#6366F1', // Indigo
  '#06B6D4', // Cyan
  '#A855F7', // Violet
  '#84CC16', // Lime
  '#D946EF', // Fuchsia
  '#64748B', // Slate
  '#B45309', // Amber dark
  '#075985', // Sky dark
  '#BE185D', // Pink dark
  '#b91c1c', // Red dark
  '#1E3A8A', // Blue dark
  '#5B21B6', // Purple dark
  '#115E59', // Teal dark
  '#166534', // Green dark
  '#7C2D12', // Orange dark
  '#581C87', // Violet dark
  '#0F766E', // Cyan dark
  '#374151', // Gray dark
];

// Assign colors to categories
// Ensure each category gets a unique and distinctive color
// We have more colors than categories to ensure good variety
[...transactionCategories, 'Other'].forEach((category, index) => {
  categoryColors[category] = baseColors[index % baseColors.length];
});

export function CategoryExpenseForecast({ transactions, isLoading }: CategoryExpenseForecastProps) {
  // Initialize state to store all expense categories found in transactions
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);
  
  // State to track which categories are selected for non-recurring expense calculation
  const [selectedCategories, setSelectedCategories] = React.useState<Record<string, boolean>>({});
  
  // Extract all expense categories from transactions
  React.useEffect(() => {
    if (!transactions.length) return;
    
    const categories = new Set<string>();
    transactions.forEach(tx => {
      if (tx.type === 'Expense' && tx.category) {
        categories.add(tx.category);
      }
    });
    
    // Add "Other" category
    categories.add('Other');
    
    const categoryArray = Array.from(categories);
    setAvailableCategories(categoryArray);
    
    // Initialize all categories as selected by default
    const initialSelectedState: Record<string, boolean> = {};
    categoryArray.forEach(category => {
      initialSelectedState[category] = true;
    });
    
    setSelectedCategories(initialSelectedState);
  }, [transactions]);
  
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
    
    // Process non-recurring transactions to find patterns, but only for selected categories
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
      
      // Skip categories that are not selected for non-recurring forecasting
      if (!selectedCategories[category]) return;
      
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
      // Skip if somehow the category is no longer selected
      if (!selectedCategories[category]) return;
      
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
  }, [transactions, selectedCategories]);

  // Create array of categories found in the data for the chart
  const categories = React.useMemo(() => {
    if (!forecastData.length) return [];
    
    const firstMonth = forecastData[0];
    return Object.keys(firstMonth).filter(key => key !== 'month');
  }, [forecastData]);
  
  return (
    <Card className="bg-white">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Expense Category Forecast</CardTitle>
            <CardDescription>6-month projection of expenses by category</CardDescription>
            <p className="text-xs text-muted-foreground">
              Based on recurring transactions and historical spending patterns
            </p>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Customize</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-4" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Non-recurring Categories</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Select which categories to include in non-recurring expense forecasts
                </p>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {availableCategories.map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`category-${category}`} 
                        checked={selectedCategories[category] || false}
                        onCheckedChange={(checked) => {
                          setSelectedCategories(prev => ({
                            ...prev,
                            [category]: checked === true
                          }));
                        }}
                      />
                      <Label
                        htmlFor={`category-${category}`}
                        className="text-sm cursor-pointer flex-1 truncate"
                      >
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between pt-2 mt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newState: Record<string, boolean> = {};
                      availableCategories.forEach(cat => {
                        newState[cat] = true;
                      });
                      setSelectedCategories(newState);
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newState: Record<string, boolean> = {};
                      availableCategories.forEach(cat => {
                        newState[cat] = false;
                      });
                      setSelectedCategories(newState);
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
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
                        <div className="bg-white p-4 border rounded-md shadow-md">
                          <p className="font-medium text-base mb-3">{label}</p>
                          <div className="text-sm space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {payload.map((entry, index) => {
                              const value = (entry.value as number) || 0;
                              const percentage = Math.round((value / total) * 100);
                              
                              return (
                                <div key={index} className="flex items-center justify-between gap-6 py-1">
                                  <div className="flex items-center min-w-[150px]">
                                    <div 
                                      className="w-4 h-4 rounded-full mr-2 border border-gray-100" 
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="font-medium" style={{ color: entry.color }}>{entry.name}</span>
                                  </div>
                                  <div className="font-medium whitespace-nowrap">
                                    {formatCurrency(value)} 
                                    <span className="text-gray-500 ml-1">
                                      ({percentage}%)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="border-t mt-3 pt-3 font-bold flex justify-between">
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
                  wrapperStyle={{ 
                    marginTop: 20, 
                    paddingTop: 10,
                    overflowX: 'auto' 
                  }}
                  iconSize={10}
                  iconType="circle"
                  formatter={(value, entry) => (
                    <span style={{ 
                      color: '#333', 
                      marginRight: 10,
                      padding: '2px 4px',
                      fontWeight: 500
                    }}>
                      {value}
                    </span>
                  )}
                />
                {categories.map((category) => (
                  <Bar 
                    key={category} 
                    dataKey={category} 
                    name={category}
                    stackId="a" 
                    fill={categoryColors[category] || '#8884d8'}
                    stroke={categoryColors[category] || '#8884d8'}
                    strokeWidth={1}
                    radius={[0, 0, 0, 0]}
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