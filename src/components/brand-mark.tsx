'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  priority?: boolean;
  logoUrl?: string | null;
  fallbackText?: string;
  alt?: string;
}

export function BrandMark({
  className,
  priority = false,
  logoUrl = '/logo-blue.png',
  fallbackText,
  alt = 'Nền tảng quản trị doanh nghiệp',
}: BrandMarkProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showMonogram = !logoUrl || imageFailed;

  return (
    <div
      className={cn(
        'flex min-h-14 items-center rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      {showMonogram ? (
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
          {(fallbackText?.trim().slice(0, 2) || 'DN').toUpperCase()}
        </span>
      ) : (
        <Image
          src={logoUrl}
          alt={alt}
          width={388}
          height={78}
          priority={priority}
          unoptimized
          onError={() => setImageFailed(true)}
          className="h-auto w-full max-w-[250px] object-contain"
        />
      )}
    </div>
  );
}
