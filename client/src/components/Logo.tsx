import React from 'react';

// Using a self-contained SVG for the Apple-style logo to avoid image loading issues
export function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizes = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <svg 
      className={`${sizes[size]}`} 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="JoBudget Logo"
    >
      {/* Simple circular background */}
      <circle cx="50" cy="50" r="45" fill="#000" />
      
      {/* Letter J in Apple SF Pro Display-like font style */}
      <text x="50" y="65" fontFamily="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" fontSize="60" fontWeight="600" fill="#fff" textAnchor="middle">J</text>
      
      {/* Small B for Budget */}
      <text x="65" y="32" fontFamily="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" fontSize="24" fontWeight="400" fill="#fff" textAnchor="middle">B</text>
    </svg>
  );
}

interface LogoWithTextProps {
  size?: 'small' | 'medium' | 'large';
  textSize?: 'sm' | 'normal' | 'lg' | 'xl' | '2xl' | '3xl';
  withSubtitle?: boolean;
}

export function LogoWithText({ 
  size = 'medium', 
  textSize = 'xl',
  withSubtitle = false,
}: LogoWithTextProps) {
  const textSizes = {
    sm: 'text-sm',
    normal: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  return (
    <div className="flex items-center">
      <Logo size={size} />
      <div className="ml-2">
        <h1 className={`${textSizes[textSize]} font-semibold tracking-tight text-primary`}>
          JoBudget
        </h1>
        {withSubtitle && (
          <p className="text-xs text-gray-500 tracking-tight">Smart Finance Management</p>
        )}
      </div>
    </div>
  );
}