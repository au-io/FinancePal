import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isValid } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts';
import { useCurrency } from '@/hooks/use-currency';
import { Skeleton } from '@/components/ui/skeleton';
import { Transaction as SchemaTransaction } from '@shared/schema';

// Extend the Transaction type
interface Transaction extends SchemaTransaction {
  isRecurringInstance?: boolean;
}

interface ExpensesByUserProps {
  transactions: Transaction[];
  familyMembers?: { id: number; name: string }[];
  isLoading: boolean;
}

export function ExpensesByUser({ 
  transactions, 
  familyMembers = [],
  isLoading 
}: ExpensesByUserProps) {
  const { currencySymbol } = useCurrency();
  
  // Get data for current month only
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Filter for current month expenses only
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return isValid(txDate) && 
        txDate >= monthStart && 
        txDate <= monthEnd &&
        tx.type === 'Expense';
    });
  }, [transactions]);
  
  // Calculate expenses by user with category split
  const expensesByUser = useMemo(() => {
    // Create a map of userId to expense data
    const userExpenses = new Map<number, {
      total: number;
      categories: Map<string, number>;
    }>();
    
    // Collect all unique categories
    const allCategories = new Set<string>();
    
    // Calculate total expenses for each user and track by category
    currentMonthData.forEach(tx => {
      const userId = tx.userId;
      const category = tx.category || 'Uncategorized';
      
      // Add to all categories
      allCategories.add(category);
      
      // Initialize user entry if not exists
      if (!userExpenses.has(userId)) {
        userExpenses.set(userId, {
          total: 0,
          categories: new Map<string, number>()
        });
      }
      
      const userData = userExpenses.get(userId)!;
      
      // Add to total
      userData.total += tx.amount;
      
      // Add to category
      if (!userData.categories.has(category)) {
        userData.categories.set(category, 0);
      }
      userData.categories.set(category, userData.categories.get(category)! + tx.amount);
    });
    
    // Convert to array format for charts
    const result = Array.from(userExpenses.entries()).map(([userId, data]) => {
      // Find user name from family members array
      const user = familyMembers.find(member => member.id === userId);
      const userName = user ? user.name : `User ${userId}`;
      
      // Create base user object
      const userResult: any = {
        userId,
        name: userName,
        amount: data.total,
      };
      
      // Add category data to user object
      Array.from(data.categories.entries()).forEach(([category, amount]) => {
        userResult[category] = amount;
      });
      
      return userResult;
    });
    
    // Sort by amount in descending order
    return {
      users: result.sort((a, b) => b.amount - a.amount),
      categories: Array.from(allCategories)
    };
  }, [currentMonthData, familyMembers]);
  
  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return expensesByUser.users.reduce((sum, item) => sum + item.amount, 0);
  }, [expensesByUser]);
  
  // Generate pie chart colors
  const COLORS = [
    '#3b82f6', // blue
    '#f97316', // orange
    '#10b981', // emerald
    '#8b5cf6', // violet
    '#f43f5e', // rose
    '#06b6d4', // cyan
    '#fbbf24', // amber
    '#ec4899', // pink
    '#14b8a6', // teal
  ];
  
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };
  
  // Custom formatter for percentage
  const formatPercentage = (value: number) => {
    if (totalExpenses === 0) return '0%';
    return `${Math.round((value / totalExpenses) * 100)}%`;
  };

  // Calculate percentage for each user
  const dataWithPercentage = expensesByUser.users.map(item => ({
    ...item,
    percentage: totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0
  }));
  
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
        <CardTitle>Current Month Expenses by User</CardTitle>
        <CardDescription>
          Who spent how much in {format(new Date(), 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row">
          {/* Pie Chart Section */}
          <div className="w-full md:w-1/2 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataWithPercentage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  nameKey="name"
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                >
                  {dataWithPercentage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  {totalExpenses === 0 && (
                    <Label 
                      value="No expenses" 
                      position="center"
                      style={{ fontSize: '16px', fill: '#666' }}
                    />
                  )}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Amount']}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Bar Chart Section with Category Split */}
          <div className="w-full md:w-1/2 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dataWithPercentage}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${currencySymbol}${value}`} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    // Format name to be more readable
                    const formattedName = name === 'amount' 
                      ? 'Total Amount'
                      : name;
                    
                    return [formatCurrency(value), formattedName];
                  }}
                  labelFormatter={(value) => `${value}`}
                />
                <Legend />
                
                {/* Add stacked bars for each expense category */}
                {expensesByUser.categories.map((category, categoryIndex) => {
                  const categoryColor = [
                    '#f87171', // red
                    '#fb923c', // orange
                    '#fbbf24', // amber
                    '#a3e635', // lime
                    '#34d399', // emerald
                    '#22d3ee', // cyan
                    '#818cf8', // indigo
                    '#c084fc', // purple
                    '#f472b6', // pink
                  ];
                  
                  const colorIndex = categoryIndex % categoryColor.length;
                  
                  return (
                    <Bar 
                      key={category}
                      dataKey={category}
                      name={category}
                      stackId="stack1"
                      fill={categoryColor[colorIndex]}
                    />
                  );
                })}
                
                {/* Add a transparent bar at the end with the label */}
                <Bar 
                  dataKey="amount" 
                  name="Total Amount"
                  fill="none"
                  label={{
                    position: 'right',
                    formatter: (value: number) => formatCurrency(value),
                    fill: '#374151',
                    fontSize: 10
                  }}
                >
                  {dataWithPercentage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="none" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}