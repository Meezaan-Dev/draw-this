"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-paper px-6 text-ink">
          <section className="max-w-md rounded-lg border border-ink/15 bg-white/70 p-6 text-center shadow-sketch">
            <p className="text-sm uppercase tracking-[0.18em] text-clay">Draw This</p>
            <h1 className="mt-2 text-2xl font-semibold">Something got smudged.</h1>
            <p className="mt-3 text-sm leading-6 text-graphite">{error.message || "The app hit an unexpected error."}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 min-h-11 rounded-lg bg-ink px-4 font-semibold text-paper transition hover:bg-clay"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
