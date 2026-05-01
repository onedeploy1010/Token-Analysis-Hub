import type { ReactNode } from "react";

/**
 * Standard wrapper for every admin page — keeps the title row, breadcrumb
 * spacing, and inner padding consistent. Pages just compose `<PageShell
 * title="..."><table /></PageShell>`.
 */
interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, subtitle, actions, children }: Props) {
  return (
    <div className="px-4 lg:px-8 py-4 lg:py-6 space-y-4 lg:space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg lg:text-2xl font-bold text-foreground tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <section>{children}</section>
    </div>
  );
}

/** Empty placeholder card used by M1 stubs; pages replace this with their
 *  actual table / cards in M2/M3. */
export function StubBody({ note }: { note: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">{note}</p>
      <p className="text-[11px] text-muted-foreground/60 mt-2">
        M2 / M3 will wire this page to Supabase and Postgres functions.
      </p>
    </div>
  );
}
