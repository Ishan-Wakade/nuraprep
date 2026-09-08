import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center bg-[#f6f1e8] px-6 py-16"
    >
      <section
        aria-labelledby="not-found-heading"
        className="w-full max-w-xl rounded-3xl border border-[#dcd9cf] bg-[#fffdf8] p-8 shadow-[0_24px_70px_rgba(18,49,54,0.10)] sm:p-12"
      >
        <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
          404 · Page not found
        </p>
        <h1 id="not-found-heading" className="mt-3 font-serif text-4xl">
          This page isn&apos;t part of NuraPrep.
        </h1>
        <p className="mt-4 text-base leading-7 text-[#405b5e]">
          The link may be outdated, or the activity may no longer be available.
          Choose a safe place to continue.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/practice"
            className="rounded-xl bg-[#116b65] px-5 py-3 text-sm font-bold text-white"
          >
            Open Math practice
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[#b9c8c2] px-5 py-3 text-sm font-bold text-[#123136]"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
