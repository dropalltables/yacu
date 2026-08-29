import { describe, expect, test } from "bun:test"
import { estimateCacheSavings, estimateCost, resolvePricing } from "./pricing"

describe("pricing", () => {
  test("matches supported model families", () => {
    expect(resolvePricing("claude-opus-4-1")).not.toBeNull()
    expect(resolvePricing("gpt-5-codex")).not.toBeNull()
    expect(resolvePricing("unknown-local-model")).toBeNull()
  })

  test("estimates cost and cache savings", () => {
    const cost = estimateCost("gpt-5-codex", {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    })

    expect(cost).toBeCloseTo(1.75)
    expect(estimateCacheSavings("gpt-5-codex", 1_000_000)).toBeCloseTo(1.575)
  })
})
