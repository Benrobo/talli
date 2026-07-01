import Link from "next/link";

export default function MarketingHome() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-8">
      <section className="max-w-2xl space-y-8 text-center">
        <p className="text-sm uppercase tracking-widest text-muted">ai-fullstack-starter</p>
        <h1 className="text-5xl font-semibold leading-tight tracking-tight">
          Ship the same stack you keep rebuilding from scratch.
        </h1>
        <p className="text-lg text-muted">
          A Bun + Turbo monorepo with a Hono engine, a Vite SPA, this Next.js
          marketing site, and a portable AI memory layer baked in.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="http://localhost:5173"
            className="px-5 py-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition"
          >
            Open the app
          </Link>
          <a
            href="#features"
            className="px-5 py-2.5 rounded-lg border border-border hover:bg-surface-subtle transition"
          >
            Learn more
          </a>
        </div>
      </section>
    </main>
  );
}
