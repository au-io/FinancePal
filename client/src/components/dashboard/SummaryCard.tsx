import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SummaryType = 'balance' | 'income' | 'expense';

interface SummaryCardProps {
  type: SummaryType;
  amount: number;
  changePercentage?: number;
  label: string;
}

export function SummaryCard({ type, amount, changePercentage, label }: SummaryCardProps) {
  const typeConfig = {
    balance: {
      icon: DollarSign,
      iconBgColor: 'bg-primary bg-opacity-10',
      iconColor: 'text-primary',
      amountColor: 'text-gray-900',
    },
    income: {
      icon: ArrowDown,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-500',
      amountColor: 'text-green-500',
    },
    expense: {
      icon: ArrowUp,
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-500',
      amountColor: 'text-red-500',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;
  
  // Format the amount as currency
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  return (
    <Card className="bg-white rounded-xl shadow-sm hover:shadow transition-shadow">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-gray-500 text-sm">{label}</p>
            <h2 className={cn("text-2xl font-semibold mt-1", config.amountColor)}>
              {formattedAmount}
            </h2>
          </div>
          <div className={cn("p-2 rounded-full", config.iconBgColor)}>
            <Icon className={cn("h-5 w-5", config.iconColor)} />
          </div>
        </div>
        
        {changePercentage !== undefined && (
          <div className="flex items-center">
            {changePercentage >= 0 ? (
              <>
                <TrendingUp className="text-green-500 text-sm mr-1 h-4 w-4" />
                <span className="text-sm text-green-500 font-medium">+{changePercentage}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="text-red-500 text-sm mr-1 h-4 w-4" />
                <span className="text-sm text-red-500 font-medium">{changePercentage}%</span>
              </>
            )}
            <span className="text-xs text-gray-500 ml-2">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
