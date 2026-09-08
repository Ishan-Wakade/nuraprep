"use client";

import Link from "next/link";

export default function ApplicationError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center bg-[#f6f1e8] px-6 py-16"
    >
      <section
        aria-labelledby="error-heading"
        className="w-full max-w-xl rounded-3xl border border-[#dcd9cf] bg-[#fffdf8] p-8 shadow-[0_24px_70px_rgba(18,49,54,0.10)] sm:p-12"
      >
        <p className="text-xs font-bold tracking-[0.14em] text-[#a64b34] uppercase">
          Temporary interruption
        </p>
        <h1 id="error-heading" className="mt-3 font-serif text-4xl">
          We couldn&apos;t finish loading this page.
        </h1>
        <p role="alert" className="mt-4 text-base leading-7 text-[#405b5e]">
          Your saved progress should still be available. Try the page again, or
          return to Math practice and reopen the activity.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-xl bg-[#116b65] px-5 py-3 text-sm font-bold text-white"
          >
            Try again
          </button>
          <Link
            href="/practice"
            className="rounded-xl border border-[#b9c8c2] px-5 py-3 text-sm font-bold text-[#123136]"
          >
            Return to Math practice
          </Link>
        </div>
      </section>
    </main>
  );
}
