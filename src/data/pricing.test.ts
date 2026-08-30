import { describe, expect, test } from "bun:test"
import { createPricingCatalog } from "./pricing"

const pricing = createPricingCatalog({
  openai: {
    id: "openai",
    models: {
      "gpt-example": {
        id: "gpt-example",
        cost: {
          input: 2,
          output: 8,
          cache_read: 0.2,
          cache_write: 2.5,
          tiers: [{
            input: 4,
            output: 12,
            cache_read: 0.4,
            cache_write: 5,
            tier: { type: "context", size: 200_000 },
          }],
        },
      },
    },
  },
  gateway: {
    id: "gateway",
    models: {
      "gpt-example": {
        id: "gpt-example",
        cost: { input: 3, output: 9 },
      },
      "shared-model": {
        id: "shared-model",
        cost: { input: 1, output: 2 },
      },
    },
  },
  another: {
    id: "another",
    models: {
      "shared-model": {
        id: "shared-model",
        cost: { input: 1, output: 2 },
      },
    },
  },
})

describe("models.dev pricing", () => {
  test("resolves exact provider and model identifiers", () => {
    expect(pricing.resolve("openai", "gpt-example")?.input).toBe(2)
    expect(pricing.resolve("openai", "openai/gpt-example")?.input).toBe(2)
    expect(pricing.resolve("missing", "shared-model")?.input).toBe(1)
    expect(pricing.resolve("missing", "gpt-example")).toBeNull()
    expect(pricing.resolve("openai", "unknown-model")).toBeNull()
  })

  test("uses input, output, cache read, and cache write rates", () => {
    const cost = pricing.estimateCost("openai", "gpt-example", {
      inputTokens: 50_000,
      outputTokens: 100_000,
      cacheCreationTokens: 50_000,
      cacheReadTokens: 50_000,
    })

    expect(cost).toBeCloseTo(1.035)
    expect(pricing.estimateCacheSavings("openai", "gpt-example", {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 1_000_000,
    })).toBeCloseTo(3.6)
  })

  test("applies context pricing tiers", () => {
    const cost = pricing.estimateCost("openai", "gpt-example", {
      inputTokens: 200_001,
      outputTokens: 1_000_000,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    })

    expect(cost).toBeCloseTo(12.800004)
  })
})
