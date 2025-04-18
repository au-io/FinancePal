import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction, Account } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { addDays, addMonths, format, isWithinInterval, isSameDay, parseISO, subMonths, isAfter, isBefore } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Settings2, Check } from 'lucide-react';

interface ExtendedCashFlowForecastProps {
  transactions: Transaction[];
  accounts: Account[];
  isLoading: boolean;
}

export function ExtendedCashFlowForecast({ transactions, accounts, isLoading }: ExtendedCashFlowForecastProps) {
  // Initialize state to store all expense categories found in transactions
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  // State to track which categories are selected for non-recurring expense calculation
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  
  // Extract all expense categories from transactions
  useEffect(() => {
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
  
  // Generate forecast data for the next 6 months (180 days)
  const forecastData = React.useMemo(() => {
    if (!transactions.length || !accounts.length) return [];
    
    const today = new Date();
    const endDate = addDays(today, 180); // 6 months forecast
    const data = [];
    
    // Start with current account balances
    let currentBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    
    // Track cumulative income and expenses for trending
    let cumulativeIncome = 0;
    let cumulativeExpenses = 0;
    
    // Calculate average daily non-recurring expenses from the past 3 months
    // but only for selected categories
    const threeMonthsAgo = subMonths(today, 3);
    const pastNonRecurringExpenses = transactions.filter(tx => {
      if (tx.isRecurring) return false;
      if (tx.type !== 'Expense') return false;
      
      // Filter by selected categories
      const category = tx.category || 'Other';
      if (!selectedCategories[category]) return false;
      
      const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
      return isAfter(txDate, threeMonthsAgo) && isBefore(txDate, today);
    });
    
    // Calculate total non-recurring expenses for the past 3 months
    const totalNonRecurringExpenses = pastNonRecurringExpenses.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Calculate average daily non-recurring expenses
    const daysSince3MonthsAgo = Math.round((today.getTime() - threeMonthsAgo.getTime()) / (1000 * 60 * 60 * 24));
    const avgDailyNonRecurringExpense = totalNonRecurringExpenses / daysSince3MonthsAgo;
    
    // Calculate monthly averages for more accurate forecasting
    const avgMonthlyNonRecurringExpense = avgDailyNonRecurringExpense * 30;
    
    // Create data points for each day in the 6-month forecast period
    for (let i = 0; i <= 180; i++) {
      const date = addDays(today, i);
      
      // Find recurring transactions due on this date
      const dayRecurringTransactions = transactions.filter(tx => {
        if (!tx.isRecurring) return false;
        
        const txDate = tx.date instanceof Date ? tx.date : parseISO(String(tx.date));
        
        if (tx.recurringEndDate) {
          const endDate = tx.recurringEndDate instanceof Date 
            ? tx.recurringEndDate 
            : parseISO(String(tx.recurringEndDate));
            
          if (isAfter(date, endDate)) return false;
        }
        
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
      
      // Calculate day's income and expenses from known transactions
      const dayIncome = allDayTransactions
        .filter(tx => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const dayExpenses = allDayTransactions
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      // Add estimated non-recurring expenses based on historical average
      // We'll distribute the monthly average across the month
      let estimatedNonRecurringExpense = 0;
      
      // Apply estimated non-recurring expenses - more on month start, less on month end
      if (date.getDate() === 1) {
        // On the first day of month, add 20% of monthly non-recurring expenses
        estimatedNonRecurringExpense = avgMonthlyNonRecurringExpense * 0.2;
      } else if (date.getDate() <= 15) {
        // First half of month, add proportional amount of remaining 50%
        estimatedNonRecurringExpense = (avgMonthlyNonRecurringExpense * 0.5) / 15;
      } else {
        // Second half of month, add proportional amount of remaining 30%
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const remainingDays = daysInMonth - 15;
        estimatedNonRecurringExpense = (avgMonthlyNonRecurringExpense * 0.3) / remainingDays;
      }
      
      // Only apply estimated expenses if there are no known expenses for this day
      const finalDayExpenses = dayExpenses > 0 ? dayExpenses : estimatedNonRecurringExpense;
      
      // Update running balance
      currentBalance += (dayIncome - finalDayExpenses);
      
      // Track cumulative totals for trending visualization
      cumulativeIncome += dayIncome;
      cumulativeExpenses += finalDayExpenses;
      
      // Calculate moving averages for smoothed trend lines
      const avgDailyIncome = i === 0 ? 0 : cumulativeIncome / (i + 1);
      const avgDailyExpense = i === 0 ? 0 : cumulativeExpenses / (i + 1);
      
      // Find a reasonable scaling factor based on the account balance size
      const dynamicScaleFactor = currentBalance > 0 
        ? Math.max(2, Math.min(5, Math.ceil(currentBalance / 5000))) 
        : 3;
        
      // Scale factor to enhance visibility of income and expense data
      const scaleFactor = dynamicScaleFactor;
      
      // Create trend lines that show expected values over time with smooth transitions
      const displayIncome = i === 0 ? dayIncome : (dayIncome > 0 ? dayIncome : avgDailyIncome * 0.5);
      const displayExpenses = i === 0 ? finalDayExpenses : (finalDayExpenses > 0 ? finalDayExpenses : avgDailyExpense * 0.5);
      
      // Group data by month for better visualization over 6 months
      // Show dates on 1st, 15th and last day of month
      const isSignificantDate = date.getDate() === 1 || date.getDate() === 15 || 
                               date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                               
      // Format date for display - only show month for 1st day
      let displayDate;
      if (date.getDate() === 1) {
        displayDate = format(date, 'MMM yyyy');
      } else if (isSignificantDate) {
        displayDate = format(date, 'MMM d');
      } else {
        displayDate = '';
      }
      
      // Add data point with all calculated values (only add labeled points on significant dates)
      if (i === 0 || i === 180 || isSignificantDate || i % 30 === 0) {
        data.push({
          date: displayDate,
          fullDate: format(date, 'MMM dd yyyy'),
          balance: currentBalance,
          income: displayIncome * scaleFactor,
          expenses: displayExpenses * scaleFactor,
          // Save actual values for tooltip display (unscaled)
          actualIncome: dayIncome,
          actualExpenses: finalDayExpenses,
          estimatedExpense: estimatedNonRecurringExpense,
          // Include transaction count for the day
          transactionCount: allDayTransactions.length,
          // Month marker for better visualization
          isMonthStart: date.getDate() === 1
        });
      }
    }
    
    return data;
  }, [transactions, accounts, selectedCategories]);

  return (
    <Card className="bg-white">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Extended Financial Forecast</CardTitle>
            <CardDescription>6-month projection with historical expense patterns</CardDescription>
            <p className="text-xs text-muted-foreground">
              Incorporates both recurring transactions and average non-recurring expenses from past 3 months
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
                        id={`forecast-category-${category}`} 
                        checked={selectedCategories[category] || false}
                        onCheckedChange={(checked) => {
                          setSelectedCategories(prev => ({
                            ...prev,
                            [category]: checked === true
                          }));
                        }}
                      />
                      <Label
                        htmlFor={`forecast-category-${category}`}
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
        ) : forecastData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-gray-500">Not enough data for extended forecast</p>
          </div>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={forecastData}
                margin={{
                  top: 15,
                  right: 30,
                  left: 10,
                  bottom: 15,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  padding={{ left: 10, right: 10 }}
                  tick={{ fontSize: 12 }}
                  tickLine={true}
                />
                {/* Primary Y-axis for balance */}
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => `$${Math.round(value / 100) * 100}`} 
                  domain={['auto', 'auto']}
                  label={{ 
                    value: 'Balance', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#7F5539', fontSize: 12 } 
                  }}
                />
                {/* Secondary Y-axis for income and expenses */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `$${Math.round(value / 100) * 100}`}
                  domain={[0, 'auto']}
                  label={{ 
                    value: 'Income/Expenses', 
                    angle: 90, 
                    position: 'insideRight',
                    style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 } 
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-md shadow-md">
                          <p className="font-medium mb-1">{dataPoint.fullDate}</p>
                          <div className="text-sm space-y-1">
                            <p className="text-[#7F5539]">
                              <span className="font-medium">Projected Balance:</span> {formatCurrency(dataPoint.balance)}
                            </p>
                            <p className="text-green-500">
                              <span className="font-medium">Income:</span> {formatCurrency(dataPoint.actualIncome)}
                              {dataPoint.transactionCount > 0 && dataPoint.actualIncome > 0 && (
                                <span className="ml-1 text-xs text-gray-500">
                                  (From transactions)
                                </span>
                              )}
                            </p>
                            <p className="text-red-500">
                              <span className="font-medium">Expenses:</span> {formatCurrency(dataPoint.actualExpenses)}
                              {dataPoint.estimatedExpense > 0 && dataPoint.transactionCount === 0 && (
                                <span className="ml-1 text-xs text-gray-500">
                                  (Estimated from history)
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
                <Legend 
                  wrapperStyle={{ paddingTop: '8px' }}
                  payload={[
                    { value: 'Projected Balance (left axis)', type: 'line', color: '#7F5539' },
                    { value: 'Expected Income (right axis)', type: 'line', color: '#10B981' },
                    { value: 'Expected Expenses (right axis)', type: 'line', color: '#EF4444' }
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#7F5539"
                  strokeWidth={2.5}
                  activeDot={{ r: 8 }}
                  name="Projected Balance"
                  yAxisId="left"
                  connectNulls={true}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
                  name="Expected Income"
                  yAxisId="right"
                  connectNulls={true}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#EF4444", strokeWidth: 0 }}
                  name="Expected Expenses"
                  yAxisId="right"
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}