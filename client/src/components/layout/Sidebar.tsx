import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { LogoWithText } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

import {
  Home,
  Wallet,
  DollarSign,
  Tag,
  Users,
  BarChart2,
  UserCheck,
  UserCog,
  Menu,
  LogOut,
  Repeat,
  X,
  User,
  ChevronRight
} from 'lucide-react';

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.isAdmin;
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const links = [
    { 
      href: '/', 
      label: 'Dashboard', 
      icon: <Home className="h-4 w-4" /> 
    },
    { 
      href: '/accounts', 
      label: 'Accounts', 
      icon: <Wallet className="h-4 w-4" /> 
    },
    { 
      href: '/transactions', 
      label: 'Transactions', 
      icon: <DollarSign className="h-4 w-4" /> 
    },
    { 
      href: '/recurring-transactions', 
      label: 'Recurring', 
      icon: <Repeat className="h-4 w-4" /> 
    },
    { 
      href: '/categories', 
      label: 'Categories', 
      icon: <Tag className="h-4 w-4" /> 
    },
    { 
      href: '/family', 
      label: 'Family', 
      icon: <Users className="h-4 w-4" /> 
    },
    { 
      href: '/analytics', 
      label: 'Analytics', 
      icon: <BarChart2 className="h-4 w-4" /> 
    },
  ];

  const adminLinks = [
    { 
      href: '/admin/families', 
      label: 'Manage Families', 
      icon: <UserCheck className="h-4 w-4" /> 
    },
    { 
      href: '/admin/users', 
      label: 'Manage Users', 
      icon: <UserCog className="h-4 w-4" /> 
    },
  ];

  const SidebarLink = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => (
    <div onClick={() => setMobileMenuOpen(false)}>
      <Link href={href}>
        <div 
          className={cn(
            "flex items-center px-4 py-2.5 rounded-xl transition-colors cursor-pointer justify-between group",
            location === href 
              ? "bg-primary/10 text-primary font-medium" 
              : "text-gray-700 hover:bg-gray-50"
          )}
        >
          <div className="flex items-center">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full mr-3",
              location === href ? "bg-primary text-white" : "bg-gray-100 text-gray-700 group-hover:bg-gray-200"
            )}>
              {icon}
            </div>
            <span className="tracking-tight">{label}</span>
          </div>
          <ChevronRight className={cn(
            "h-4 w-4 opacity-0 transition-opacity", 
            location === href ? "opacity-100 text-primary" : "group-hover:opacity-40"
          )} />
        </div>
      </Link>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex justify-between items-center p-4 bg-white border-b sticky top-0 z-40">
        <LogoWithText size="small" textSize="lg" />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          className="relative z-50"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Sidebar */}
      <aside className={cn(
        "bg-white shadow-lg z-50 transition-all overflow-y-auto",
        "md:w-64 md:flex md:flex-col md:min-h-screen md:sticky md:top-0",
        mobileMenuOpen 
          ? "fixed inset-0 flex flex-col w-full sm:w-80" 
          : "hidden md:flex"
      )}>
        <div className="p-4 md:p-6 flex flex-col h-full">
          {/* Mobile sidebar header */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <LogoWithText size="small" textSize="lg" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Logo - Apple style */}
          <div className="hidden md:block mb-6 px-4">
            <LogoWithText size="large" textSize="2xl" withSubtitle={true} />
          </div>
          
          {/* User Profile - Moved to top with Apple style */}
          {user && (
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex flex-col items-center mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center shadow-sm mb-2">
                  <span className="text-xl font-medium">{user.name.charAt(0)}</span>
                </div>
                <div className="text-center">
                  <p className="font-medium tracking-tight">{user.name}</p>
                  <p className="text-xs text-gray-500 tracking-tight">{user.email}</p>
                </div>
              </div>
              <div className="mt-2">
                <SidebarLink 
                  href="/profile" 
                  label="My Profile" 
                  icon={<User className="h-4 w-4" />} 
                />
              </div>
            </div>
          )}
          
          {/* Navigation */}
          <nav className="space-y-1 flex-1">
            {links.map((link) => (
              <SidebarLink 
                key={link.href} 
                href={link.href} 
                label={link.label} 
                icon={link.icon} 
              />
            ))}
            
            {/* Admin Section - Apple style */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-4 text-xs font-medium text-gray-500 mb-2 tracking-tight">
                  Administration
                </p>
                {adminLinks.map((link) => (
                  <SidebarLink 
                    key={link.href} 
                    href={link.href} 
                    label={link.label} 
                    icon={link.icon} 
                  />
                ))}
              </div>
            )}
          </nav>
          
          {/* Sign Out Button - Apple-inspired style */}
          {user && (
            <div className="mt-auto pt-4 border-t border-gray-200">
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-center text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-colors"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="tracking-tight">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </aside>
      
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
