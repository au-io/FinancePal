import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@shared/schema';
import { DataTable } from '@/components/ui/data-table';
import { format, addMonths, addYears, addDays, isFuture, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface UpcomingPaymentsProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEditTransaction: (transaction: Transaction) => void;
}

export function UpcomingPayments({ transactions, isLoading, onEditTransaction }: UpcomingPaymentsProps) {
  // Get recurring transactions and calculate their next occurrence
  const upcomingPayments = useMemo(() => {
    if (!transactions.length) return [];
    
    return transactions
      .filter(t => t.isRecurring && t.type === 'Expense')
      .map(t => {
        // Calculate next payment date based on frequency
        const lastDate = parseISO(t.date.toString());
        let nextDate = new Date();
        
        switch(t.frequency) {
          case 'Monthly':
            nextDate = addMonths(lastDate, 1);
            // If specific day is set, adjust to that day
            if (t.frequencyDay) {
              nextDate.setDate(t.frequencyDay);
            }
            break;
          case 'Yearly':
            nextDate = addYears(lastDate, 1);
            break;
          case 'Custom':
            if (t.frequencyCustomDays) {
              nextDate = addDays(lastDate, t.frequencyCustomDays);
            }
            break;
          default:
            nextDate = addMonths(lastDate, 1);
        }
        
        // Only include future payments
        if (isFuture(nextDate)) {
          return {
            ...t,
            nextDate
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [transactions]);

  const columns = [
    {
      header: 'Description',
      accessor: (tx: any) => tx.description || tx.category,
    },
    {
      header: 'Amount',
      accessor: (tx: any) => (
        <span className="text-red-500 font-medium">
          -${tx.amount.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Account',
      accessor: 'sourceAccountId',
    },
    {
      header: 'Next Date',
      accessor: (tx: any) => format(tx.nextDate, 'MMM dd, yyyy'),
    },
    {
      header: 'Frequency',
      accessor: 'frequency',
    },
    {
      header: '',
      accessor: (tx: any) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onEditTransaction(tx);
          }}
        >
          <Edit className="h-4 w-4 text-primary" />
        </Button>
      ),
      className: 'text-right',
    },
  ];

  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-heading">Upcoming Recurring Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center animate-pulse">
            <div className="w-full h-full bg-gray-100 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm mt-6">
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle className="text-lg font-heading">Upcoming Recurring Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingPayments.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <p>No upcoming recurring payments</p>
            <p className="text-sm mt-2">Set up recurring transactions to see them here</p>
          </div>
        ) : (
          <DataTable
            data={upcomingPayments}
            columns={columns}
            onRowClick={(tx) => onEditTransaction(tx)}
          />
        )}
      </CardContent>
    </Card>
  );
}
