export type TokenParts = {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

type ModelsDevCost = {
  input: number
  output: number
  cache_read?: number
  cache_write?: number
  tiers: Array<{
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
    tier: { type: "context", size: number }
  }>
}

type ModelsDevModel = {
  id: string
  cost: ModelsDevCost
}

type ProviderModels = Map<string, ModelsDevModel>

export type PricingCatalog = {
  resolve: (provider: string, model: string, tokens?: TokenParts) => ModelsDevCost | null
  estimateCost: (provider: string, model: string, tokens: TokenParts) => number
  estimateCacheSavings: (provider: string, model: string, tokens: TokenParts) => number
}

const MODELS_DEV_API_URL = process.env.MODELS_DEV_API_URL ?? "https://models.dev/api.json"
const TOKENS_PER_MILLION = 1_000_000

export async function loadPricingCatalog(): Promise<PricingCatalog> {
  const response = await fetch(MODELS_DEV_API_URL)
  if (!response.ok) throw new Error(`models.dev pricing request failed (${response.status})`)
  return createPricingCatalog(await response.json())
}

export function createPricingCatalog(value: unknown): PricingCatalog {
  const providers = parseProviders(value)

  const resolve = (provider: string, model: string, tokens?: TokenParts): ModelsDevCost | null => {
    const direct = resolveFromProvider(providers.get(normalizeId(provider)), provider, model)
    const resolved = direct ?? resolveUnambiguousModel(providers, model)
    return resolved == null ? null : applyContextTier(resolved.cost, tokens)
  }

  return {
    resolve,
    estimateCost(provider, model, tokens) {
      const cost = resolve(provider, model, tokens)
      if (cost == null) return 0
      const input = tokens.inputTokens * cost.input
      const output = tokens.outputTokens * cost.output
      const cacheRead = tokens.cacheReadTokens * (cost.cache_read ?? cost.input)
      const cacheWrite = tokens.cacheCreationTokens * (cost.cache_write ?? cost.input)
      return (input + output + cacheRead + cacheWrite) / TOKENS_PER_MILLION
    },
    estimateCacheSavings(provider, model, tokens) {
      const cost = resolve(provider, model, tokens)
      if (cost == null) return 0
      return Math.max(0, tokens.cacheReadTokens * (cost.input - (cost.cache_read ?? cost.input)) / TOKENS_PER_MILLION)
    },
  }
}

function parseProviders(value: unknown): Map<string, ProviderModels> {
  const providers = new Map<string, ProviderModels>()
  if (!isObject(value)) throw new Error("models.dev returned an invalid catalog")

  for (const [providerKey, providerValue] of Object.entries(value)) {
    if (!isObject(providerValue) || !isObject(providerValue.models)) continue
    const models: ProviderModels = new Map()
    for (const [modelKey, modelValue] of Object.entries(providerValue.models)) {
      const model = parseModel(modelKey, modelValue)
      if (model == null) continue
      models.set(normalizeId(modelKey), model)
      models.set(normalizeId(model.id), model)
    }
    providers.set(normalizeId(providerKey), models)
    if (typeof providerValue.id === "string") providers.set(normalizeId(providerValue.id), models)
  }

  if (providers.size === 0) throw new Error("models.dev returned an empty catalog")
  return providers
}

function parseModel(modelKey: string, value: unknown): ModelsDevModel | null {
  if (!isObject(value) || !isObject(value.cost)) return null
  const input = finiteNumber(value.cost.input)
  const output = finiteNumber(value.cost.output)
  if (input == null || output == null) return null

  return {
    id: typeof value.id === "string" ? value.id : modelKey,
    cost: {
      input,
      output,
      cache_read: finiteNumber(value.cost.cache_read) ?? undefined,
      cache_write: finiteNumber(value.cost.cache_write) ?? undefined,
      tiers: parseTiers(value.cost.tiers),
    },
  }
}

function parseTiers(value: unknown): ModelsDevCost["tiers"] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isObject(entry) || !isObject(entry.tier) || entry.tier.type !== "context") return []
    const size = finiteNumber(entry.tier.size)
    if (size == null) return []
    return [{
      input: finiteNumber(entry.input) ?? undefined,
      output: finiteNumber(entry.output) ?? undefined,
      cache_read: finiteNumber(entry.cache_read) ?? undefined,
      cache_write: finiteNumber(entry.cache_write) ?? undefined,
      tier: { type: "context" as const, size },
    }]
  }).sort((left, right) => left.tier.size - right.tier.size)
}

function resolveFromProvider(models: ProviderModels | undefined, provider: string, model: string): ModelsDevModel | null {
  if (models == null) return null
  for (const candidate of modelCandidates(provider, model)) {
    const match = models.get(candidate)
    if (match != null) return match
  }
  return null
}

function resolveUnambiguousModel(providers: Map<string, ProviderModels>, model: string): ModelsDevModel | null {
  const matches = new Map<string, ModelsDevModel>()
  const candidate = normalizeId(model)
  for (const models of new Set(providers.values())) {
    const match = models.get(candidate)
    if (match != null) matches.set(costSignature(match.cost), match)
  }
  return matches.size === 1 ? [...matches.values()][0]! : null
}

function applyContextTier(cost: ModelsDevCost, tokens?: TokenParts): ModelsDevCost {
  if (tokens == null) return cost
  const contextTokens = tokens.inputTokens + tokens.cacheCreationTokens + tokens.cacheReadTokens
  const tier = cost.tiers.findLast((candidate) => contextTokens > candidate.tier.size)
  if (tier == null) return cost
  return {
    ...cost,
    input: tier.input ?? cost.input,
    output: tier.output ?? cost.output,
    cache_read: tier.cache_read ?? cost.cache_read,
    cache_write: tier.cache_write ?? cost.cache_write,
  }
}

function modelCandidates(provider: string, model: string): string[] {
  const normalizedProvider = normalizeId(provider)
  const normalizedModel = normalizeId(model)
  const prefix = `${normalizedProvider}/`
  return normalizedModel.startsWith(prefix)
    ? [normalizedModel, normalizedModel.slice(prefix.length)]
    : [normalizedModel]
}

function costSignature(cost: ModelsDevCost): string {
  return JSON.stringify(cost)
}

function normalizeId(value: string): string {
  return value.trim().toLowerCase()
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}
