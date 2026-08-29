import { describe, expect, test } from "bun:test"
import type { SourceId } from "../domain/types"
import { chartColumnForDay, dayIndexAtColumn, renderBrailleChart } from "./chart"

const emptySeries = (): Record<SourceId, number[]> => ({
  claude: [0, 0, 0],
  codex: [0, 0, 0],
  grok: [0, 0, 0],
  opencode: [0, 0, 0],
  cursor: [0, 0, 0],
  gemini: [0, 0, 0],
})

describe("renderBrailleChart", () => {
  test("renders the requested cell dimensions", () => {
    const series = emptySeries()
    series.claude = [0, 5, 10]

    const chart = renderBrailleChart(series, 12, 4)

    expect(chart.max).toBe(10)
    expect(chart.rows).toHaveLength(4)
    expect(chart.rows.every((row) => row.reduce((length, part) => length + part.text.length, 0) === 12)).toBeTrue()
    expect(chart.rows.flatMap((row) => row).some((part) => part.text.trim().length > 0)).toBeTrue()
  })

  test("handles empty data", () => {
    const chart = renderBrailleChart(emptySeries(), 8, 3)

    expect(chart.max).toBe(0)
    expect(chart.rows).toHaveLength(3)
  })

  test("maps pointer columns to days", () => {
    expect(dayIndexAtColumn(0, 15, 30)).toBe(0)
    expect(dayIndexAtColumn(14, 15, 30)).toBe(29)
    expect(chartColumnForDay(29, 15, 30)).toBe(14)
  })

  test("highlights the active column", () => {
    const series = emptySeries()
    series.codex = [1, 2, 3]

    const chart = renderBrailleChart(series, 8, 3, 4, "#123456")

    expect(chart.rows.every((row) => row.some((part) => part.background === "#123456"))).toBeTrue()
  })
})
