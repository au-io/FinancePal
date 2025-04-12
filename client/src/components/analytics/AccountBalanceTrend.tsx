import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction, Account } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseISO, isAfter, isBefore, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

interface AccountBalanceTrendProps {
  transactions: Transaction[];
  accounts: Account[];
  isPersonalView: boolean;
}

export function AccountBalanceTrend({ transactions, accounts, isPersonalView }: AccountBalanceTrendProps) {
  // Generate historical balance data
  const balanceData = React.useMemo(() => {
    if (!transactions.length || !accounts.length) return [];
    
    // Start from 6 months ago
    const startDate = subMonths(new Date(), 6);
    const endDate = new Date();
    
    const months = [];
    let currentDate = startOfMonth(startDate);
    
    while (isBefore(currentDate, endDate)) {
      months.push({
        date: currentDate,
        key: format(currentDate, 'MMM yyyy'),
      });
      currentDate = startOfMonth(endOfMonth(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add current month
    months.push({
      date: startOfMonth(endDate),
      key: format(startOfMonth(endDate), 'MMM yyyy'),
    });
    
    // Calculate balance for each month
    const chartData = months.map((month) => {
      // Filter transactions up to this month
      const txsBeforeMonth = transactions.filter((tx) => {
        const txDate = parseISO(tx.date.toString());
        return isBefore(txDate, month.date);
      });
      
      // Calculate balance changes from transactions
      const balanceChanges = txsBeforeMonth.reduce((changes, tx) => {
        if (tx.type === 'Income') {
          changes[tx.sourceAccountId] = (changes[tx.sourceAccountId] || 0) + tx.amount;
        } else if (tx.type === 'Expense') {
          changes[tx.sourceAccountId] = (changes[tx.sourceAccountId] || 0) - tx.amount;
        } else if (tx.type === 'Transfer' && tx.destinationAccountId) {
          changes[tx.sourceAccountId] = (changes[tx.sourceAccountId] || 0) - tx.amount;
          changes[tx.destinationAccountId] = (changes[tx.destinationAccountId] || 0) + tx.amount;
        }
        return changes;
      }, {} as Record<number, number>);
      
      // Calculate ending balance for each account
      const accountBalances = accounts.reduce((acc, account) => {
        const initialBalance = account.balance;
        const changes = balanceChanges[account.id] || 0;
        
        // Estimate the starting balance by subtracting changes
        const estimatedBalance = initialBalance - changes;
        
        acc[account.name] = estimatedBalance;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        month: month.key,
        total: Object.values(accountBalances).reduce((sum, balance) => sum + balance, 0),
        ...accountBalances,
      };
    });
    
    return chartData;
  }, [transactions, accounts]);

  // Get colors for the lines
  const getLineColor = (index: number) => {
    const colors = ['#7F5539', '#9C6644', '#F8A100', '#0F766E', '#14B8A6', '#EF4444'];
    return colors[index % colors.length];
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Account Balance Trend</CardTitle>
        <CardDescription>
          {isPersonalView 
            ? 'Historical balance trend for your accounts' 
            : 'Historical balance trend for all family accounts'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {balanceData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-gray-500">Not enough data for balance trend</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={balanceData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value as number)} 
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#F8A100"
                  strokeWidth={2}
                  name="Total Balance"
                />
                {accounts.map((account, index) => (
                  <Line
                    key={account.id}
                    type="monotone"
                    dataKey={account.name}
                    stroke={getLineColor(index)}
                    name={account.name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
