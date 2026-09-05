import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Math practice | NuraPrep",
  robots: { index: false, follow: false },
};

export default function PracticeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f1e9] text-[#15383a]">
      <header className="border-b border-[#d7ddd7] bg-[#fffdf8]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold tracking-tight"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[10px_10px_10px_3px] bg-[#116b65] font-serif text-lg text-white italic">
              N
            </span>
            NuraPrep
          </Link>
          <div className="flex items-center gap-3 text-xs font-semibold text-[#587073]">
            <span className="hidden rounded-full bg-[#e8f2ee] px-3 py-1.5 sm:inline">
              Development learner
            </span>
            <Link href="/practice" className="text-[#116b65]">
              Practice home
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
