import {
  estimateUsdCost,
  normalizeTokenUsage,
  pricingFromUsdPerMillion,
  type Pricing,
} from "tokentally"

export type TokenParts = {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

const PRICING: Array<[RegExp, Pricing]> = [
  [/claude.*opus/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 5, outputUsdPerMillion: 25, cachedInputUsdPerMillion: 0.5, cacheCreationInputUsdPerMillion: 6.25 })],
  [/claude.*sonnet/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 3, outputUsdPerMillion: 15, cachedInputUsdPerMillion: 0.3, cacheCreationInputUsdPerMillion: 3.75 })],
  [/claude.*haiku/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 1, outputUsdPerMillion: 5, cachedInputUsdPerMillion: 0.1, cacheCreationInputUsdPerMillion: 1.25 })],
  [/(^|\/)gpt-5|codex/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 1.75, outputUsdPerMillion: 14, cachedInputUsdPerMillion: 0.175 })],
  [/grok|composer/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 2, outputUsdPerMillion: 10, cachedInputUsdPerMillion: 0.2 })],
  [/deepseek/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 0.27, outputUsdPerMillion: 1.1, cachedInputUsdPerMillion: 0.07 })],
  [/gemini-3\.1-pro/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 2, outputUsdPerMillion: 12, cachedInputUsdPerMillion: 0.2 })],
  [/gemini-2\.5-pro/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 1.25, outputUsdPerMillion: 10, cachedInputUsdPerMillion: 0.125 })],
  [/gemini-3\.[67]-flash/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 0.75, outputUsdPerMillion: 3.75, cachedInputUsdPerMillion: 0.075 })],
  [/gemini-3\.5-flash/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 1.5, outputUsdPerMillion: 9, cachedInputUsdPerMillion: 0.15 })],
  [/gemini-3\.1-flash-lite/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 0.25, outputUsdPerMillion: 1.5, cachedInputUsdPerMillion: 0.025 })],
  [/gemini.*flash/i, pricingFromUsdPerMillion({ inputUsdPerMillion: 0.3, outputUsdPerMillion: 2.5, cachedInputUsdPerMillion: 0.03 })],
]

export function resolvePricing(model: string): Pricing | null {
  return PRICING.find(([pattern]) => pattern.test(model))?.[1] ?? null
}

export function estimateCost(model: string, tokens: TokenParts): number {
  const usage = normalizeTokenUsage({
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    cachedInputTokens: tokens.cacheReadTokens,
    cacheCreationInputTokens: tokens.cacheCreationTokens,
  })
  return estimateUsdCost({ usage, pricing: resolvePricing(model) })?.totalUsd ?? 0
}

export function estimateCacheSavings(model: string, cachedReadTokens: number): number {
  const pricing = resolvePricing(model)
  if (pricing == null) return 0
  const cachedRate = pricing.cachedInputUsdPerToken ?? pricing.inputUsdPerToken
  return Math.max(0, cachedReadTokens * (pricing.inputUsdPerToken - cachedRate))
}
