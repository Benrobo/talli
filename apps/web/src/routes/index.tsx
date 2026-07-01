import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-8">
      <div className="max-w-xl space-y-6 text-center">
        <p className="text-sm uppercase tracking-widest text-muted">ai-fullstack-starter</p>
        <h1 className="text-4xl font-semibold leading-tight">
          Build fast on the stack you already use.
        </h1>
        <p className="text-lg text-muted">
          Bun + Turbo + Vite + Hono + Prisma + Tailwind v4, with curated agent
          memory and the design-icons duotone set baked in.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/auth"
            className="px-5 py-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition"
          >
            Get started
          </Link>
          <a
            href="https://github.com"
            className="px-5 py-2.5 rounded-lg border border-border hover:bg-surface-subtle transition"
          >
            View source
          </a>
        </div>
      </div>
    </main>
  );
}
