import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        success: 'border-[#B9EFC5] bg-[#EAF7EC] text-[#2B6A3F]',
        warning: 'border-[#F1C76D] bg-[#FFF4D9] text-[#745C27]',
        destructive: 'border-[#E7B5B3] bg-[#FCECEB] text-[#A83836]',
        outline: 'border-border bg-white text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
