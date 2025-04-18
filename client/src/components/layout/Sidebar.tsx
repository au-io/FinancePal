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
  User
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
      icon: <Home className="h-5 w-5 mr-3" /> 
    },
    { 
      href: '/accounts', 
      label: 'Accounts', 
      icon: <Wallet className="h-5 w-5 mr-3" /> 
    },
    { 
      href: '/transactions', 
      label: 'Transactions', 
      icon: <DollarSign className="h-5 w-5 mr-3" /> 
    },
    { 
      href: '/recurring-transactions', 
      label: 'Recurring', 
      icon: <Repeat className="h-5 w-5 mr-3" /> 
    },
    { 
      href: '/categories', 
      label: 'Categories', 
      icon: <Tag className="h-5 w-5 mr-3" /> 
    },
    { 
      href: '/family', 
      label: 'Family', 
      icon: <Users className="h-5 w-5 mr-3" /> 
    },
    { 
      href: '/analytics', 
      label: 'Analytics', 
      icon: <BarChart2 className="h-5 w-5 mr-3" /> 
    },
  ];

  const adminLinks = [
    { 
      href: '/admin/families', 
      label: 'Manage Families', 
      icon: <UserCheck className="h-5 w-5 mr-3" /> 
    },
    { 
      href: '/admin/users', 
      label: 'Manage Users', 
      icon: <UserCog className="h-5 w-5 mr-3" /> 
    },
  ];

  const SidebarLink = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => (
    <div onClick={() => setMobileMenuOpen(false)}>
      <Link href={href}>
        <div 
          className={cn(
            "flex items-center px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer",
            location === href 
              ? "border-l-2 border-primary bg-primary/5 text-primary font-medium" 
              : "text-gray-700"
          )}
        >
          {icon}
          <span>{label}</span>
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
          
          {/* Logo */}
          <div className="hidden md:block mb-6">
            <LogoWithText size="medium" withSubtitle={true} />
          </div>
          
          {/* User Profile - Moved to top */}
          {user && (
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                  <span>{user.name.charAt(0)}</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="mt-3">
                <SidebarLink 
                  href="/profile" 
                  label="My Profile" 
                  icon={<User className="h-5 w-5 mr-3" />} 
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
            
            {/* Admin Section */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-4 text-xs uppercase font-semibold text-gray-500 mb-2">
                  Admin
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
          
          {/* Sign Out Button - Kept at bottom */}
          {user && (
            <div className="mt-auto pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign Out</span>
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
