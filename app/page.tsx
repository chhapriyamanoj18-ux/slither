import { SnakeGame } from '@/components/snake-game'

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
          Arcade
        </span>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Neon Snake
        </h1>
      </header>

      <SnakeGame />
    </main>
  )
}
