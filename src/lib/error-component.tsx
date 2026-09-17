export function ErrorFallback({ error }: { error: Error }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-fg">
      <h1 className="font-display text-2xl tracking-wide">Something broke</h1>
      <p className="mt-3 max-w-md text-center text-sm text-muted">{error.message}</p>
      <button
        type="button"
        className="mt-6 rounded-lg bg-fg px-6 py-2 text-sm text-bg"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </main>
  );
}
