import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Transaction } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseISO, format } from 'date-fns';

interface SubscriptionAnalyticsProps {
  transactions: Transaction[];
}

export function SubscriptionAnalytics({ transactions }: SubscriptionAnalyticsProps) {
  // Extract recurring transactions (subscriptions)
  const subscriptions = React.useMemo(() => {
    if (!transactions.length) return [];
    
    // Filter recurring expenses
    const recurringExpenses = transactions.filter(tx => 
      tx.isRecurring && tx.type === 'Expense'
    );
    
    // Group by category + description to identify unique subscriptions
    const subscriptionMap = new Map<string, Transaction>();
    
    recurringExpenses.forEach(tx => {
      const key = `${tx.category}_${tx.description}`;
      
      // Only keep the most recent transaction for each subscription
      if (!subscriptionMap.has(key) || 
          new Date(tx.date) > new Date(subscriptionMap.get(key)!.date)) {
        subscriptionMap.set(key, tx);
      }
    });
    
    // Convert to array and sort by amount (highest first)
    return Array.from(subscriptionMap.values())
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);
  
  // Calculate monthly total
  const monthlyTotal = React.useMemo(() => {
    return subscriptions.reduce((total, sub) => {
      // Apply frequency multiplier
      let monthlyAmount = sub.amount;
      
      if (sub.frequency === 'Yearly') {
        monthlyAmount = sub.amount / 12;
      } else if (sub.frequency === 'Custom' && sub.frequencyCustomDays) {
        monthlyAmount = (sub.amount * 30) / sub.frequencyCustomDays;
      }
      
      return total + monthlyAmount;
    }, 0);
  }, [subscriptions]);
  
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Recurring Expenses</CardTitle>
        <CardDescription>Monthly subscriptions and recurring bills</CardDescription>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No recurring expenses found</p>
            <p className="text-sm text-gray-400 mt-1">
              Create recurring transactions to track your subscriptions
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Monthly Total</h3>
                  <p className="text-2xl font-semibold text-red-500 mt-1">
                    {formatCurrency(monthlyTotal)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600">Subscriptions</p>
                  <p className="text-2xl font-semibold text-gray-700 mt-1">
                    {subscriptions.length}
                  </p>
                </div>
              </div>
            </div>
            
            <ScrollArea className="h-[180px]">
              <div className="space-y-3">
                {subscriptions.map((sub, index) => {
                  // Calculate effective monthly cost
                  let monthlyAmount = sub.amount;
                  let frequencyLabel = '';
                  
                  if (sub.frequency === 'Monthly') {
                    frequencyLabel = 'Monthly';
                  } else if (sub.frequency === 'Yearly') {
                    monthlyAmount = sub.amount / 12;
                    frequencyLabel = 'Yearly';
                  } else if (sub.frequency === 'Custom' && sub.frequencyCustomDays) {
                    monthlyAmount = (sub.amount * 30) / sub.frequencyCustomDays;
                    frequencyLabel = `Every ${sub.frequencyCustomDays} days`;
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className="flex justify-between items-center p-3 border rounded-md"
                    >
                      <div>
                        <p className="font-medium">
                          {sub.description || sub.category}
                        </p>
                        <p className="text-xs text-gray-500">{frequencyLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-500">
                          {formatCurrency(sub.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(monthlyAmount)}/mo
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}