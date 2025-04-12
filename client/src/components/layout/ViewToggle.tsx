import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, User } from 'lucide-react';

interface ViewToggleProps {
  isPersonalView: boolean;
  onToggle: () => void;
}

export function ViewToggle({ isPersonalView, onToggle }: ViewToggleProps) {
  return (
    <div className="inline-flex bg-muted rounded-md">
      <Button
        variant={isPersonalView ? "default" : "ghost"}
        className={`rounded-r-none ${isPersonalView ? '' : 'text-muted-foreground'}`}
        onClick={() => isPersonalView || onToggle()}
      >
        <User className="mr-2 h-4 w-4" />
        Personal
      </Button>
      <Button
        variant={!isPersonalView ? "default" : "ghost"}
        className={`rounded-l-none ${!isPersonalView ? '' : 'text-muted-foreground'}`}
        onClick={() => !isPersonalView || onToggle()}
      >
        <Users className="mr-2 h-4 w-4" />
        Family
      </Button>
    </div>
  );
}