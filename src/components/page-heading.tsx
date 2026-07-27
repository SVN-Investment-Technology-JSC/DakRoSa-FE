interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function PageHeading({ eyebrow, title, description, actions }: PageHeadingProps) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[#DDE5DC] pb-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <span className="mb-2 block text-[12px] font-black tracking-[0.12em] text-[#386948] uppercase">
          {eyebrow}
        </span>
        <h1 className="font-display text-[clamp(1.7rem,3vw,2.25rem)] leading-tight font-bold tracking-[-0.025em] text-[#2C342E]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667067]">
          {description}
        </p>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
