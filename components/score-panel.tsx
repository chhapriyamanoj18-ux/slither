interface Stat {
  label: string
  value: string | number
  accent?: boolean
}

function StatBlock({ label, value, accent }: Stat) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border bg-card/60 px-3 py-3">
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={`font-mono text-2xl font-bold tabular-nums ${
          accent ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function ScorePanel({
  score,
  best,
  level,
}: {
  score: number
  best: number
  level: number
}) {
  return (
    <div className="flex w-full items-stretch gap-3">
      <StatBlock label="Score" value={score} accent />
      <StatBlock label="Level" value={level} />
      <StatBlock label="Best" value={best} />
    </div>
  )
}
