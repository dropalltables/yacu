import { afterEach, describe, expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import type { TestRendererSetup } from "@opentui/core/testing"
import { act } from "react"
import { buildDashboard } from "../../domain/aggregate"
import { localDate } from "../../domain/dates"
import { SOURCE_ORDER, type UsageDataset } from "../../domain/types"
import { terminalTheme } from "../theme"
import { Chart } from "./Chart"

let setup: TestRendererSetup | null = null

afterEach(() => {
  act(() => { setup?.renderer.destroy() })
  setup = null
})

describe("Chart", () => {
  test("shows point cost on hover and selects the day on click", async () => {
    const today = localDate(new Date())
    const dataset: UsageDataset = {
      scannedAt: new Date(),
      errors: [],
      sessions: [{ id: "codex:1", source: "codex", date: today }],
      records: [{
        date: today,
        source: "codex",
        model: "gpt-5-codex",
        sessionId: "codex:1",
        inputTokens: 100,
        outputTokens: 10,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        costUsd: 2,
        cacheSavingsUsd: 0,
      }],
    }
    const dashboard = buildDashboard(dataset, 7, "cost")
    let selected: string | null = null
    setup = await testRender(
      <Chart
        dashboard={dashboard}
        metric="cost"
        width={40}
        height={4}
        visibleSources={new Set(SOURCE_ORDER)}
        selectedDay={selected}
        onSelectDay={(day) => { selected = day }}
      />,
      { width: 40, height: 8, autoFocus: false },
    )
    await setup.renderOnce()

    await act(async () => { await setup!.mockMouse.moveTo(37, 2) })
    await setup.flush()

    expect(setup.captureCharFrame()).toContain("$2.00")
    const highlightedSpans = setup.captureSpans().lines.flatMap((line) => line.spans)
      .filter((span) => span.bg.equals(terminalTheme("dark").selected))
    expect(highlightedSpans.length).toBeGreaterThanOrEqual(4)

    await act(async () => { await setup!.mockMouse.click(37, 2) })

    expect(String(selected)).toBe(today)
    expect(setup.renderer.getSelection()).toBeNull()
  })
})
