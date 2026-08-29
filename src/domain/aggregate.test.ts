import { describe, expect, test } from "bun:test"
import { localDate } from "./dates"
import { buildDashboard } from "./aggregate"
import type { UsageDataset } from "./types"

const today = localDate(new Date())
const dataset: UsageDataset = {
  scannedAt: new Date(),
  errors: [],
  sessions: [
    { id: "claude-1", source: "claude", date: today },
    { id: "codex-1", source: "codex", date: today },
  ],
  records: [
    {
      date: today,
      source: "claude",
      model: "claude-opus-4-1",
      sessionId: "claude-1",
      inputTokens: 100,
      outputTokens: 20,
      cacheCreationTokens: 10,
      cacheReadTokens: 70,
      costUsd: 2,
      cacheSavingsUsd: 0.1,
    },
    {
      date: today,
      source: "codex",
      model: "gpt-5-codex",
      sessionId: "codex-1",
      inputTokens: 50,
      outputTokens: 25,
      cacheCreationTokens: 0,
      cacheReadTokens: 25,
      costUsd: 1,
      cacheSavingsUsd: 0.05,
    },
  ],
}

describe("buildDashboard", () => {
  test("aggregates providers, sessions, and models", () => {
    const dashboard = buildDashboard(dataset, 1, "cost")

    expect(dashboard.totals.processedTokens).toBe(300)
    expect(dashboard.totals.costUsd).toBe(3)
    expect(dashboard.sessions).toBe(2)
    expect(dashboard.providers.map((provider) => provider.source)).toEqual(["codex", "claude"])
    expect(dashboard.providers[0]?.share).toBeCloseTo(1 / 3)
    expect(dashboard.models[0]?.label).toBe("claude-opus-4-1")
  })

  test("uses token share when token mode is selected", () => {
    const dashboard = buildDashboard(dataset, 1, "tokens")

    expect(dashboard.providers[0]?.share).toBeCloseTo(1 / 3)
    expect(dashboard.providers[1]?.share).toBeCloseTo(2 / 3)
    expect(dashboard.series.claude.at(-1)).toBe(200)
    expect(dashboard.series.codex.at(-1)).toBe(100)
  })
})
