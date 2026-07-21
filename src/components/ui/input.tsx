import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 rounded-xl border border-input bg-card px-4 py-2 text-base text-foreground shadow-sm outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/15',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
