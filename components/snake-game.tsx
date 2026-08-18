'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ScorePanel } from '@/components/score-panel'
import { GameOverlay } from '@/components/game-overlay'

export type GameStatus = 'ready' | 'playing' | 'paused' | 'over'

type Point = { x: number; y: number }
type Dir = 'up' | 'down' | 'left' | 'right'

const COLS = 20
const ROWS = 20
const RESOLUTION = 600 // logical pixels; cell = 30px
const CELL = RESOLUTION / COLS

const BASE_INTERVAL = 150 // ms per step at level 1
const MIN_INTERVAL = 65
const SPEEDUP_PER_LEVEL = 9
const FOOD_PER_LEVEL = 5

const DIR_VECTORS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const COLORS = {
  boardBg: '#181b28',
  boardBg2: '#1e2233',
  grid: 'rgba(255,255,255,0.035)',
  headStart: '#9af7a8',
  headEnd: '#38c072',
  tailEnd: '#1f6d45',
  glow: '#4fdd8a',
  food: '#f6b64a',
  foodGlow: '#f89b2c',
  eye: '#12141f',
}

interface GameState {
  snake: Point[]
  prevSnake: Point[]
  dir: Dir
  pending: Dir[]
  food: Point
  interval: number
  status: GameStatus
  score: number
  level: number
  eaten: number
}

function createInitialState(): GameState {
  const startX = Math.floor(COLS / 2)
  const startY = Math.floor(ROWS / 2)
  const snake: Point[] = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ]
  return {
    snake,
    prevSnake: snake.map((s) => ({ ...s })),
    dir: 'right',
    pending: [],
    food: spawnFood(snake),
    interval: BASE_INTERVAL,
    status: 'ready',
    score: 0,
    level: 1,
    eaten: 0,
  }
}

function spawnFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`))
  const free: Point[] = []
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) return { x: 0, y: 0 }
  return free[Math.floor(Math.random() * free.length)]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<GameState>(createInitialState())
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const accRef = useRef<number>(0)

  const [status, setStatus] = useState<GameStatus>('ready')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [best, setBest] = useState(0)
  const [isNewBest, setIsNewBest] = useState(false)

  const syncUI = useCallback(() => {
    const g = gameRef.current
    setStatus(g.status)
    setScore(g.score)
    setLevel(g.level)
  }, [])

  const step = useCallback(() => {
    const g = gameRef.current

    // Apply the next queued direction that isn't a reversal.
    while (g.pending.length > 0) {
      const next = g.pending.shift() as Dir
      if (next !== OPPOSITE[g.dir] && next !== g.dir) {
        g.dir = next
        break
      }
    }

    const vec = DIR_VECTORS[g.dir]
    const head = g.snake[0]
    const newHead: Point = { x: head.x + vec.x, y: head.y + vec.y }

    // Wall collision.
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      endGame()
      return
    }

    const willEat = newHead.x === g.food.x && newHead.y === g.food.y

    // Self collision. The tail cell frees up unless we're growing.
    const body = willEat ? g.snake : g.snake.slice(0, -1)
    if (body.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      endGame()
      return
    }

    g.prevSnake = g.snake.map((s) => ({ ...s }))
    const newSnake = [newHead, ...g.snake]
    if (!willEat) newSnake.pop()
    g.snake = newSnake

    if (willEat) {
      g.eaten += 1
      g.score += 10 * g.level
      g.level = Math.floor(g.eaten / FOOD_PER_LEVEL) + 1
      g.interval = Math.max(
        MIN_INTERVAL,
        BASE_INTERVAL - (g.level - 1) * SPEEDUP_PER_LEVEL,
      )
      g.food = spawnFood(g.snake)
      syncUI()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUI])

  const endGame = useCallback(() => {
    const g = gameRef.current
    g.status = 'over'
    setBest((prevBest) => {
      const beat = g.score > prevBest
      setIsNewBest(beat)
      return beat ? g.score : prevBest
    })
    syncUI()
  }, [syncUI])

  const draw = useCallback((interp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const g = gameRef.current

    // Board background.
    const bgGrad = ctx.createLinearGradient(0, 0, RESOLUTION, RESOLUTION)
    bgGrad.addColorStop(0, COLORS.boardBg)
    bgGrad.addColorStop(1, COLORS.boardBg2)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, RESOLUTION, RESOLUTION)

    // Grid dots.
    ctx.fillStyle = COLORS.grid
    for (let x = 0; x <= COLS; x++) {
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath()
        ctx.arc(x * CELL, y * CELL, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Food with a soft pulsing glow.
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260)
    const fx = g.food.x * CELL + CELL / 2
    const fy = g.food.y * CELL + CELL / 2
    ctx.save()
    ctx.shadowColor = COLORS.foodGlow
    ctx.shadowBlur = 14 + pulse * 10
    ctx.fillStyle = COLORS.food
    ctx.beginPath()
    ctx.arc(fx, fy, CELL * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Snake with interpolated positions and head-to-tail gradient.
    const len = g.snake.length
    const t = g.status === 'playing' ? interp : 0
    for (let i = len - 1; i >= 0; i--) {
      const cur = g.snake[i]
      const prev = g.prevSnake[i] ?? cur
      const px = lerp(prev.x, cur.x, t) * CELL
      const py = lerp(prev.y, cur.y, t) * CELL

      const shade = i / Math.max(len - 1, 1)
      ctx.save()
      if (i === 0) {
        ctx.shadowColor = COLORS.glow
        ctx.shadowBlur = 16
      }
      ctx.fillStyle =
        i === 0
          ? COLORS.headStart
          : mixHex(COLORS.headEnd, COLORS.tailEnd, shade)
      const inset = i === 0 ? 1.5 : 2.5
      roundRect(
        ctx,
        px + inset,
        py + inset,
        CELL - inset * 2,
        CELL - inset * 2,
        i === 0 ? 8 : 6,
      )
      ctx.fill()
      ctx.restore()

      // Eyes on the head, oriented to travel direction.
      if (i === 0) {
        const vec = DIR_VECTORS[g.dir]
        const cx = px + CELL / 2
        const cy = py + CELL / 2
        const perpX = vec.y
        const perpY = vec.x
        const eyeOff = CELL * 0.18
        const fwd = CELL * 0.12
        ctx.fillStyle = COLORS.eye
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(
            cx + perpX * eyeOff * s + vec.x * fwd,
            cy + perpY * eyeOff * s + vec.y * fwd,
            CELL * 0.08,
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }
      }
    }
  }, [])

  // Main animation loop.
  useEffect(() => {
    const frame = (time: number) => {
      const g = gameRef.current
      if (lastTimeRef.current === 0) lastTimeRef.current = time
      const dt = time - lastTimeRef.current
      lastTimeRef.current = time

      if (g.status === 'playing') {
        accRef.current += dt
        let guard = 0
        while (accRef.current >= g.interval && guard < 5) {
          accRef.current -= g.interval
          step()
          guard++
          if (g.status !== 'playing') {
            accRef.current = 0
            break
          }
        }
      } else {
        accRef.current = 0
      }

      const interp = Math.min(accRef.current / g.interval, 1)
      draw(interp)
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [step, draw])

  // Set up the high-DPI canvas once.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = RESOLUTION * dpr
    canvas.height = RESOLUTION * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [])

  const startOrResume = useCallback(() => {
    const g = gameRef.current
    if (g.status === 'ready' || g.status === 'over') {
      gameRef.current = createInitialState()
      gameRef.current.status = 'playing'
      accRef.current = 0
      setIsNewBest(false)
    } else if (g.status === 'paused') {
      g.status = 'playing'
    }
    syncUI()
  }, [syncUI])

  const togglePause = useCallback(() => {
    const g = gameRef.current
    if (g.status === 'playing') g.status = 'paused'
    else if (g.status === 'paused') g.status = 'playing'
    syncUI()
  }, [syncUI])

  const queueDir = useCallback((dir: Dir) => {
    const g = gameRef.current
    if (g.status !== 'playing') return
    const last = g.pending.length > 0 ? g.pending[g.pending.length - 1] : g.dir
    if (dir === last || dir === OPPOSITE[last]) return
    if (g.pending.length < 3) g.pending.push(dir)
  }, [])

  // Keyboard controls.
  useEffect(() => {
    const keyMap: Record<string, Dir> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
      W: 'up',
      S: 'down',
      A: 'left',
      D: 'right',
    }

    const handler = (e: KeyboardEvent) => {
      const g = gameRef.current
      if (e.key in keyMap) {
        e.preventDefault()
        if (g.status === 'ready' || g.status === 'over') {
          startOrResume()
          queueDir(keyMap[e.key])
        } else {
          queueDir(keyMap[e.key])
        }
        return
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        if (g.status === 'ready' || g.status === 'over') startOrResume()
        else togglePause()
      }
      if ((e.key === 'Enter' || e.key === 'r' || e.key === 'R') && g.status === 'over') {
        e.preventDefault()
        startOrResume()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [startOrResume, togglePause, queueDir])

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-4">
      <ScorePanel score={score} best={best} level={level} />

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          aria-label="Snake game board"
          role="img"
        />
        <GameOverlay
          status={status}
          score={score}
          best={best}
          isNewBest={isNewBest}
          onStart={startOrResume}
        />
      </div>

      <DirectionPad onDir={queueDir} />
    </div>
  )
}

function DirectionPad({ onDir }: { onDir: (d: Dir) => void }) {
  const btn =
    'flex h-14 items-center justify-center rounded-xl border border-border bg-card/70 text-xl text-foreground active:bg-secondary'
  return (
    <div className="mx-auto grid w-44 grid-cols-3 grid-rows-3 gap-2 sm:hidden">
      <span />
      <button className={btn} aria-label="Move up" onClick={() => onDir('up')}>
        ↑
      </button>
      <span />
      <button className={btn} aria-label="Move left" onClick={() => onDir('left')}>
        ←
      </button>
      <span />
      <button className={btn} aria-label="Move right" onClick={() => onDir('right')}>
        →
      </button>
      <span />
      <button className={btn} aria-label="Move down" onClick={() => onDir('down')}>
        ↓
      </button>
      <span />
    </div>
  )
}

// --- canvas helpers ---

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function mixHex(a: string, b: string, t: number) {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const r = Math.round(lerp(ca.r, cb.r, t))
  const g = Math.round(lerp(ca.g, cb.g, t))
  const bl = Math.round(lerp(ca.b, cb.b, t))
  return `rgb(${r},${g},${bl})`
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}
