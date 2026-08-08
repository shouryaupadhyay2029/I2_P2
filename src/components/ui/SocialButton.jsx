import React from 'react';
import { Button } from './Button';
import { FcGoogle } from 'react-icons/fc';
import { cn } from '../../utils/cn';

export const SocialButton = ({ 
  provider = 'google', 
  children, 
  className,
  ...props 
}) => {
  return (
    <Button 
      variant="secondary"
      className={cn("w-full relative justify-center gap-3", className)}
      {...props}
    >
      {provider === 'google' && <FcGoogle className="w-5 h-5 absolute left-4" />}
      {children}
    </Button>
  );
};
