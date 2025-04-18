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
    try {
      if (!transactions || !Array.isArray(transactions) || !transactions.length) return [];
      
      // Filter recurring expenses
      const recurringExpenses = transactions.filter(tx => {
        if (!tx) return false;
        return tx.isRecurring && tx.type === 'Expense';
      });
      
      // Group by category + description to identify unique subscriptions
      const subscriptionMap = new Map<string, Transaction>();
      
      recurringExpenses.forEach(tx => {
        try {
          if (!tx.category) return;
          
          const description = tx.description || '';
          const key = `${tx.category}_${description}`;
          
          // Only keep the most recent transaction for each subscription
          if (!subscriptionMap.has(key) || 
              (tx.date && subscriptionMap.get(key)?.date && 
               new Date(tx.date) > new Date(subscriptionMap.get(key)!.date))) {
            subscriptionMap.set(key, tx);
          }
        } catch (err) {
          console.error("Error processing subscription transaction:", tx, err);
        }
      });
      
      // Convert to array and sort by amount (highest first)
      return Array.from(subscriptionMap.values())
        .sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } catch (err) {
      console.error("Error extracting subscriptions:", err);
      return [];
    }
  }, [transactions]);
  
  // Calculate monthly total
  const monthlyTotal = React.useMemo(() => {
    try {
      if (!subscriptions || !subscriptions.length) return 0;
      
      return subscriptions.reduce((total, sub) => {
        try {
          // Apply frequency multiplier
          const amount = sub.amount || 0;
          let monthlyAmount = amount;
          
          if (sub.frequency === 'Yearly') {
            monthlyAmount = amount / 12;
          } else if (sub.frequency === 'Custom' && sub.frequencyCustomDays && sub.frequencyCustomDays > 0) {
            monthlyAmount = (amount * 30) / sub.frequencyCustomDays;
          }
          
          return total + monthlyAmount;
        } catch (err) {
          console.error("Error calculating monthly amount for subscription:", sub, err);
          return total;
        }
      }, 0);
    } catch (err) {
      console.error("Error calculating monthly total:", err);
      return 0;
    }
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
                  try {
                    if (!sub || !sub.category) return null;
                    
                    // Calculate effective monthly cost
                    const amount = sub.amount || 0;
                    let monthlyAmount = amount;
                    let frequencyLabel = '';
                    
                    if (sub.frequency === 'Monthly') {
                      frequencyLabel = 'Monthly';
                    } else if (sub.frequency === 'Yearly') {
                      monthlyAmount = amount / 12;
                      frequencyLabel = 'Yearly';
                    } else if (sub.frequency === 'Custom' && sub.frequencyCustomDays && sub.frequencyCustomDays > 0) {
                      monthlyAmount = (amount * 30) / sub.frequencyCustomDays;
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
                            {formatCurrency(amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(monthlyAmount)}/mo
                          </p>
                        </div>
                      </div>
                    );
                  } catch (err) {
                    console.error("Error rendering subscription item:", sub, err);
                    return null;
                  }
                }).filter(Boolean)}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}