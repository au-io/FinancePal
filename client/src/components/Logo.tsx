import React from 'react';
import iconPath from "@assets/icon_1744477817841.png";

export function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizes = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <img 
      src={iconPath} 
      alt="JoBa Finance Logo" 
      className={`${sizes[size]} object-contain`}
    />
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
        <h1 className={`${textSizes[textSize]} font-bold text-primary`}>
          JoBa Finance
        </h1>
        {withSubtitle && (
          <p className="text-xs text-gray-500">Family Finance Management</p>
        )}
      </div>
    </div>
  );
}