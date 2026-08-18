import { Button } from '@/components/ui/button'
import type { GameStatus } from '@/components/snake-game'

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs text-secondary-foreground">
      {children}
    </kbd>
  )
}

export function GameOverlay({
  status,
  score,
  best,
  isNewBest,
  onStart,
}: {
  status: GameStatus
  score: number
  best: number
  isNewBest: boolean
  onStart: () => void
}) {
  if (status === 'playing') return null

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/78 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center gap-5 px-6 text-center">
        {status === 'ready' && (
          <>
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground">
                Neon Snake
              </h2>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                Eat the glowing food to grow. Every 5 bites raises the level and
                the speed. Don&apos;t hit the walls or yourself.
              </p>
            </div>
            <Button size="lg" className="w-full font-semibold" onClick={onStart}>
              Start Game
            </Button>
          </>
        )}

        {status === 'paused' && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Paused
            </h2>
            <Button size="lg" className="w-full font-semibold" onClick={onStart}>
              Resume
            </Button>
          </>
        )}

        {status === 'over' && (
          <>
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-destructive">
                Game Over
              </h2>
              {isNewBest ? (
                <p className="text-sm font-medium text-primary">
                  New best score!
                </p>
              ) : null}
              <div className="mt-1 flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Score
                  </span>
                  <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
                    {score}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Best
                  </span>
                  <span className="font-mono text-3xl font-bold tabular-nums text-primary">
                    {best}
                  </span>
                </div>
              </div>
            </div>
            <Button size="lg" className="w-full font-semibold" onClick={onStart}>
              Play Again
            </Button>
          </>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <KeyCap>↑</KeyCap>
            <KeyCap>↓</KeyCap>
            <KeyCap>←</KeyCap>
            <KeyCap>→</KeyCap>
            move
          </span>
          <span className="flex items-center gap-1.5">
            <KeyCap>Space</KeyCap>
            pause
          </span>
        </div>
      </div>
    </div>
  )
}
