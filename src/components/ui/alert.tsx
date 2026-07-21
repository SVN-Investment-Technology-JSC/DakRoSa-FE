import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 rounded-xl border px-4 py-3 text-base', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      destructive: 'border-red-200 bg-red-50 text-red-800 [&>svg]:text-red-600',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('text-sm leading-6', className)} {...props} />;
}

export { Alert, AlertDescription };
