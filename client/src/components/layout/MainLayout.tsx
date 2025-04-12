import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FFFBEB]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
