import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  priority?: boolean;
}

export function BrandMark({
  className,
  priority = false,
}: BrandMarkProps) {
  return (
    <div
      className={cn(
        'flex min-h-14 items-center rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      <Image
        src="/brand/dakrosa-logo.jpg"
        alt="EVN HPC ĐăkRơSa"
        width={388}
        height={78}
        priority={priority}
        className="h-auto w-full max-w-[250px] object-contain"
      />
    </div>
  );
}
