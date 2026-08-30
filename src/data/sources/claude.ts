import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { localDate } from "../../domain/dates"
import type { UsageRecord, UsageSession } from "../../domain/types"
import type { PricingCatalog } from "../pricing"
import { asObject, forEachJsonLine, globFiles, numberValue, stringValue } from "../jsonl"
import type { SourceLoadResult } from "../types"

type ClaudeEntry = {
  timestamp: string
  sessionId: string | null
  model: string
  messageId: string | null
  requestId: string | null
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

export async function loadClaudeUsage(pricing: PricingCatalog): Promise<SourceLoadResult> {
  const files = [...new Set((await Promise.all(
    claudeRoots().map((root) => globFiles(
      join(root, "projects"),
      "**/*.jsonl",
      { includeSymlinks: true },
    )),
  )).flat())]
  const records: UsageRecord[] = []
  const sessions = new Map<string, UsageSession>()
  const processed = new Set<string>()

  for (const path of files) {
    await forEachJsonLine(path, (value) => {
      const entry = parseClaudeUsageEntry(value)
      if (entry == null) return

      const uniqueId = entry.messageId != null && entry.requestId != null
        ? `${entry.messageId}:${entry.requestId}`
        : null
      if (uniqueId != null && processed.has(uniqueId)) return
      if (uniqueId != null) processed.add(uniqueId)

      const date = localDate(entry.timestamp)
      const sessionId = entry.sessionId == null ? undefined : `claude:${entry.sessionId}`
      const tokens = {
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        cacheCreationTokens: entry.cacheCreationTokens,
        cacheReadTokens: entry.cacheReadTokens,
      }
      if (sumTokens(tokens) === 0 || entry.model === "<synthetic>") return

      records.push({
        date,
        source: "claude",
        model: entry.model,
        sessionId,
        ...tokens,
        costUsd: pricing.estimateCost("anthropic", entry.model, tokens),
        cacheSavingsUsd: pricing.estimateCacheSavings("anthropic", entry.model, tokens),
      })

      if (sessionId != null) {
        const existing = sessions.get(sessionId)
        if (existing == null || existing.date < date) {
          sessions.set(sessionId, { id: sessionId, source: "claude", date })
        }
      }
    })
  }

  return { records, sessions: [...sessions.values()], files: files.length }
}

export function parseClaudeUsageEntry(value: unknown): ClaudeEntry | null {
  const row = asObject(value)
  const message = asObject(row?.message)
  const usage = asObject(message?.usage)
  const timestamp = stringValue(row?.timestamp)
  const inputTokens = finiteNumber(usage?.input_tokens)
  const outputTokens = finiteNumber(usage?.output_tokens)

  if (
    timestamp == null
    || Number.isNaN(new Date(timestamp).getTime())
    || inputTokens == null
    || outputTokens == null
  ) return null

  return {
    timestamp,
    sessionId: stringValue(row?.sessionId),
    model: stringValue(message?.model) ?? "unknown",
    messageId: stringValue(message?.id),
    requestId: stringValue(row?.requestId),
    inputTokens,
    outputTokens,
    cacheCreationTokens: numberValue(usage?.cache_creation_input_tokens),
    cacheReadTokens: numberValue(usage?.cache_read_input_tokens),
  }
}

function claudeRoots(): string[] {
  const configured = process.env.CLAUDE_CONFIG_DIR?.trim()
  if (configured != null && configured !== "") {
    return [...new Set(configured.split(",").map((path) => resolve(path.trim())).filter(Boolean))]
  }
  return [join(homedir(), ".config", "claude"), join(homedir(), ".claude")]
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function sumTokens(tokens: Pick<UsageRecord, "inputTokens" | "outputTokens" | "cacheCreationTokens" | "cacheReadTokens">): number {
  return tokens.inputTokens + tokens.outputTokens + tokens.cacheCreationTokens + tokens.cacheReadTokens
}
