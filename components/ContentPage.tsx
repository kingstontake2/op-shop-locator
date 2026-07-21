import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { SupportLink } from "@/components/SupportLink";

type ContentPageProps = {
  title: string;
  children: ReactNode;
};

export function ContentPage({ title, children }: ContentPageProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/80 bg-surface-elevated px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2">
          <Link
            href="/"
            className="focus-ring flex items-center gap-2 rounded-lg font-display text-xl text-brand-ink"
          >
            <BrandMark className="h-7 w-7" />
            Op Shop Locator
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/about"
              className="focus-ring rounded text-muted hover:text-brand-ink"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="focus-ring rounded text-muted hover:text-brand-ink"
            >
              Privacy
            </Link>
            <SupportLink compact />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl tracking-tight text-brand-ink sm:text-4xl">
          {title}
        </h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/85 sm:text-base [&_a]:text-brand-ink [&_a]:underline [&_a]:decoration-brand/30 [&_a]:underline-offset-2 hover:[&_a]:decoration-brand">
          {children}
        </div>
        <p className="mt-12">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-1.5 text-brand-ink underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
          >
            ← Back to the map
          </Link>
        </p>
      </main>
    </div>
  );
}
