import Link from "next/link";
import type { ReactNode } from "react";
import { SupportLink } from "@/components/SupportLink";

type ContentPageProps = {
  title: string;
  children: ReactNode;
};

export function ContentPage({ title, children }: ContentPageProps) {
  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900">
      <header className="border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl text-teal-900"
          >
            Op Shop Locator
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/about" className="text-stone-600 hover:text-teal-800">
              About
            </Link>
            <Link href="/privacy" className="text-stone-600 hover:text-teal-800">
              Privacy
            </Link>
            <SupportLink compact />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-teal-900">
          {title}
        </h1>
        <div className="prose-stone mt-6 space-y-4 text-sm leading-relaxed text-stone-700 sm:text-base">
          {children}
        </div>
        <p className="mt-10">
          <Link href="/" className="text-teal-800 underline hover:text-teal-950">
            ← Back to the map
          </Link>
        </p>
      </main>
    </div>
  );
}
