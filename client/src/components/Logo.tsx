import React from 'react';

export function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-24 h-24',
  };

  return (
    <svg 
      className={sizeClasses[size]} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="90" fill="#F8A100" stroke="#7F5539" strokeWidth="10" />
      <circle cx="100" cy="100" r="70" fill="#F8A100" stroke="#F9B234" strokeWidth="5" />
      <path d="M100 50C93.3333 50 78 60 78 80C78 100 93.3333 120 100 140C106.667 120 122 100 122 80C122 60 106.667 50 100 50Z" fill="#0F766E" />
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
  withSubtitle = false 
}: LogoWithTextProps) {
  const textSizeClass = {
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
      <div className="ml-3">
        <h1 className={`${textSizeClass[textSize]} font-heading font-semibold text-primary`}>
          JoBa Finance
        </h1>
        {withSubtitle && (
          <p className="text-xs text-gray-500">Family Finance</p>
        )}
      </div>
    </div>
  );
}
