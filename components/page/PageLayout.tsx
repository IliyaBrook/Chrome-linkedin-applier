import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageLayoutProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

export function PageLayout({
  title,
  description,
  actions,
  children,
  className,
  wide = false,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={cn(
          'mx-auto px-6 py-8',
          wide ? 'max-w-[1800px]' : 'max-w-6xl',
        )}
      >
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className={cn('flex flex-col gap-6', className)}>{children}</main>
      </div>
    </div>
  );
}
