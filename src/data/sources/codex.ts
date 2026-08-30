import { homedir } from "node:os"
import { join } from "node:path"
import { localDate } from "../../domain/dates"
import type { UsageRecord, UsageSession } from "../../domain/types"
import type { PricingCatalog } from "../pricing"
import { asObject, forEachJsonLine, globFiles, numberValue, stringValue } from "../jsonl"
import type { SourceLoadResult } from "../types"

export async function loadCodexUsage(pricing: PricingCatalog): Promise<SourceLoadResult> {
  const root = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "sessions")
  const files = await globFiles(root, "**/*.jsonl")
  const records: UsageRecord[] = []
  const sessions = new Map<string, UsageSession>()

  for (const path of files) {
    let sessionId = path
    let model = "codex"
    let provider = "openai"
    let skipSession = false
    let previousTotal = ""

    await forEachJsonLine(path, (unknownValue) => {
      const value = asObject(unknownValue)
      const payload = asObject(value?.payload)
      const type = stringValue(value?.type)

      if (type === "session_meta") {
        sessionId = stringValue(payload?.id) ?? sessionId
        provider = stringValue(payload?.model_provider) ?? provider
        const timestamp = stringValue(payload?.timestamp) ?? stringValue(value?.timestamp)
        const sessionSource = JSON.stringify([payload?.thread_source, payload?.source]).toLowerCase()
        skipSession = sessionSource.includes("subagent")
        previousTotal = ""
        if (timestamp != null && !skipSession) {
          sessions.set(sessionId, { id: `codex:${sessionId}`, source: "codex", date: localDate(timestamp) })
        }
        return
      }

      if (type === "turn_context") {
        model = stringValue(payload?.model) ?? model
        return
      }

      if (skipSession || type !== "event_msg" || payload?.type !== "token_count") return
      const info = asObject(payload.info)
      const last = asObject(info?.last_token_usage)
      const total = asObject(info?.total_token_usage)
      if (last == null) return

      const signature = JSON.stringify(total)
      if (signature === previousTotal) return
      previousTotal = signature

      const cached = numberValue(last.cached_input_tokens)
      const rawInput = numberValue(last.input_tokens)
      const input = Math.max(0, rawInput - cached)
      const output = numberValue(last.output_tokens)
      if (input + cached + output === 0) return
      const timestamp = stringValue(value?.timestamp) ?? new Date().toISOString()
      const tokens = { inputTokens: input, outputTokens: output, cacheCreationTokens: 0, cacheReadTokens: cached }
      records.push({
        date: localDate(timestamp),
        source: "codex",
        model,
        sessionId: `codex:${sessionId}`,
        ...tokens,
        costUsd: pricing.estimateCost(provider, model, tokens),
        cacheSavingsUsd: pricing.estimateCacheSavings(provider, model, tokens),
      })
    })
  }

  return { records, sessions: [...sessions.values()], files: files.length }
}
