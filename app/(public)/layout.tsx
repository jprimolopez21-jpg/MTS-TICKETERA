import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link
            href="/eventos"
            className="text-sm font-bold tracking-[0.2em] text-zinc-900 uppercase"
          >
            MTS Ticketera
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-zinc-100 py-8 text-center">
        <p className="text-xs text-zinc-400">
          © {new Date().getFullYear()} MTS Ticketera · soporte@mts-ticketera.com
        </p>
      </footer>
    </div>
  )
}
