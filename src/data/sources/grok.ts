import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"
import { localDate } from "../../domain/dates"
import type { UsageRecord, UsageSession } from "../../domain/types"
import { estimateCacheSavings, estimateCost } from "../pricing"
import { asObject, forEachJsonLine, globFiles, numberValue, stringValue } from "../jsonl"
import type { SourceLoadResult } from "../types"

export async function loadGrokUsage(): Promise<SourceLoadResult> {
  const root = process.env.GROK_HOME ?? join(homedir(), ".grok")
  const files = await globFiles(join(root, "sessions"), "**/updates.jsonl")
  const records: UsageRecord[] = []
  const sessions = new Map<string, UsageSession>()

  for (const path of files) {
    const sessionId = `grok:${basename(dirname(path))}`
    await forEachJsonLine(path, (unknownValue) => {
      const value = asObject(unknownValue)
      const update = asObject(value?.update)
      const usage = asObject(update?.usage)
      if (update?.sessionUpdate !== "turn_completed" || usage == null) return
      const metadata = asObject(value?._meta)
      const timestamp = stringValue(value?.timestamp) ?? (numberValue(metadata?.agentTimestampMs) || Date.now())
      const date = localDate(timestamp)
      const models = asObject(usage.modelUsage)
      const entries = models == null ? [["grok-build", usage] as const] : Object.entries(models)
      const cost = numberValue(usage.costUsdTicks) / 1_000_000_000
      const tokenWeights = entries.map(([, entry]) => {
        const tokens = asObject(entry)
        return numberValue(tokens?.inputTokens) + numberValue(tokens?.outputTokens)
      })
      const totalWeight = tokenWeights.reduce((sum, value) => sum + value, 0)

      entries.forEach(([model, entry], index) => {
        const raw = asObject(entry)
        const cached = numberValue(raw?.cachedReadTokens)
        const input = Math.max(0, numberValue(raw?.inputTokens) - cached)
        const tokens = {
          inputTokens: input,
          outputTokens: numberValue(raw?.outputTokens),
          cacheCreationTokens: 0,
          cacheReadTokens: cached,
        }
        const allocatedCost = totalWeight > 0 ? cost * (tokenWeights[index]! / totalWeight) : 0
        records.push({
          date,
          source: "grok",
          model,
          sessionId,
          ...tokens,
          costUsd: allocatedCost || estimateCost(model, tokens),
          cacheSavingsUsd: estimateCacheSavings(model, cached),
        })
      })
      sessions.set(sessionId, { id: sessionId, source: "grok", date })
    })
  }

  return { records, sessions: [...sessions.values()], files: files.length }
}
