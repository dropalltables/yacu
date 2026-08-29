import type { ColorInput } from "@opentui/core"
import type { SourceId } from "../domain/types"
import { terminalTheme, type Theme } from "./theme"

export type ChartSegment = { text: string; color: ColorInput; background?: ColorInput }
export type ChartRow = ChartSegment[]

type Cell = { bits: number; source: SourceId | null }

const DOTS = [
  [1, 8],
  [2, 16],
  [4, 32],
  [64, 128],
] as const

export function renderBrailleChart(
  series: Record<SourceId, number[]>,
  width: number,
  height: number,
  highlightColumn?: number,
  highlightColor?: ColorInput,
  highlightForeground?: ColorInput,
  palette: Theme = terminalTheme("dark"),
): { rows: ChartRow[]; max: number } {
  const safeWidth = Math.max(4, width)
  const safeHeight = Math.max(3, height)
  const pixelWidth = safeWidth * 2
  const pixelHeight = safeHeight * 4
  const cells: Cell[][] = Array.from({ length: safeHeight }, () =>
    Array.from({ length: safeWidth }, () => ({ bits: 0, source: null })),
  )
  const entries = (Object.entries(series) as Array<[SourceId, number[]]>)
    .filter(([, values]) => values.some((value) => value > 0))
    .sort(([, a], [, b]) => sum(a) - sum(b))
  const max = Math.max(0, ...entries.flatMap(([, values]) => values))

  if (max > 0) {
    for (const [source, values] of entries) {
      const points = values.map((value, index) => ({
        x: values.length <= 1 ? 0 : Math.round((index / (values.length - 1)) * (pixelWidth - 1)),
        y: Math.round((1 - value / max) * (pixelHeight - 1)),
      }))
      if (points.length === 1) plot(cells, points[0]!.x, points[0]!.y, source)
      for (let index = 1; index < points.length; index++) {
        drawLine(cells, points[index - 1]!, points[index]!, source)
      }
    }
  }

  return {
    max,
    rows: cells.map((row) => groupSegments(row, highlightColumn, highlightColor, highlightForeground, palette)),
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function drawLine(
  cells: Cell[][],
  from: { x: number; y: number },
  to: { x: number; y: number },
  source: SourceId,
): void {
  let x = from.x
  let y = from.y
  const dx = Math.abs(to.x - from.x)
  const sx = from.x < to.x ? 1 : -1
  const dy = -Math.abs(to.y - from.y)
  const sy = from.y < to.y ? 1 : -1
  let error = dx + dy

  while (true) {
    plot(cells, x, y, source)
    if (x === to.x && y === to.y) return
    const doubled = error * 2
    if (doubled >= dy) {
      error += dy
      x += sx
    }
    if (doubled <= dx) {
      error += dx
      y += sy
    }
  }
}

function plot(cells: Cell[][], pixelX: number, pixelY: number, source: SourceId): void {
  const row = Math.floor(pixelY / 4)
  const column = Math.floor(pixelX / 2)
  const cell = cells[row]?.[column]
  if (cell == null) return
  cell.bits |= DOTS[pixelY % 4]![pixelX % 2]!
  cell.source = source
}

function groupSegments(
  cells: Cell[],
  highlightColumn?: number,
  highlightColor?: ColorInput,
  highlightForeground?: ColorInput,
  palette: Theme = terminalTheme("dark"),
): ChartSegment[] {
  const segments: ChartSegment[] = []
  for (const [column, cell] of cells.entries()) {
    const text = cell.bits === 0 ? " " : String.fromCodePoint(0x2800 + cell.bits)
    const color = column === highlightColumn && highlightForeground != null
      ? highlightForeground
      : cell.source == null ? palette.faint : palette.sources[cell.source]
    const background = column === highlightColumn ? highlightColor : undefined
    const previous = segments.at(-1)
    if (previous?.color === color && previous.background === background) previous.text += text
    else segments.push({ text, color, background })
  }
  return segments
}

export function dayIndexAtColumn(column: number, width: number, dayCount: number): number {
  if (dayCount <= 1 || width <= 1) return 0
  const bounded = Math.max(0, Math.min(width - 1, column))
  return Math.round((bounded / (width - 1)) * (dayCount - 1))
}

export function chartColumnForDay(index: number, width: number, dayCount: number): number {
  if (dayCount <= 1 || width <= 1) return 0
  const bounded = Math.max(0, Math.min(dayCount - 1, index))
  return Math.round((bounded / (dayCount - 1)) * (width - 1))
}
