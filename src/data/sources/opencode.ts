import { homedir } from "node:os"
import { join } from "node:path"
import { localDate } from "../../domain/dates"
import type { UsageRecord, UsageSession } from "../../domain/types"
import type { PricingCatalog } from "../pricing"
import { asObject, globFiles, numberValue, stringValue } from "../jsonl"
import type { SourceLoadResult } from "../types"

export async function loadOpenCodeUsage(pricing: PricingCatalog): Promise<SourceLoadResult> {
  const root = process.env.OPENCODE_DATA_DIR ?? join(homedir(), ".local", "share", "opencode")
  const files = await globFiles(join(root, "storage", "message"), "**/*.json")
  const seen = new Set<string>()
  const records: UsageRecord[] = []
  const sessions = new Map<string, UsageSession>()

  for (const path of files) {
    try {
      const message = asObject(await Bun.file(path).json())
      const id = stringValue(message?.id)
      const model = stringValue(message?.modelID)
      const provider = stringValue(message?.providerID) ?? "opencode"
      const tokensValue = asObject(message?.tokens)
      if (id == null || model == null || tokensValue == null || seen.has(id)) continue
      seen.add(id)
      const cache = asObject(tokensValue.cache)
      const tokens = {
        inputTokens: numberValue(tokensValue.input),
        outputTokens: numberValue(tokensValue.output),
        cacheCreationTokens: numberValue(cache?.write),
        cacheReadTokens: numberValue(cache?.read),
      }
      if (Object.values(tokens).every((value) => value === 0)) continue
      const time = asObject(message?.time)
      const date = localDate(numberValue(time?.created) || Date.now())
      const rawSession = stringValue(message?.sessionID) ?? id
      const sessionId = `opencode:${rawSession}`
      records.push({
        date,
        source: "opencode",
        model,
        sessionId,
        ...tokens,
        costUsd: pricing.estimateCost(provider, model, tokens),
        cacheSavingsUsd: pricing.estimateCacheSavings(provider, model, tokens),
      })
      sessions.set(sessionId, { id: sessionId, source: "opencode", date })
    } catch {
      continue
    }
  }

  return { records, sessions: [...sessions.values()], files: files.length }
}
