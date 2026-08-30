import { homedir } from "node:os"
import { basename, join } from "node:path"
import { localDate } from "../../domain/dates"
import type { UsageRecord, UsageSession } from "../../domain/types"
import type { PricingCatalog } from "../pricing"
import { asObject, globFiles, numberValue, stringValue } from "../jsonl"
import type { SourceLoadResult } from "../types"

type ParsedConversation = {
  sessionId: string
  startTime: string | null
  messages: Array<Record<string, unknown>>
}

export async function loadGeminiUsage(pricing: PricingCatalog): Promise<SourceLoadResult> {
  const root = process.env.GEMINI_HOME ?? join(homedir(), ".gemini")
  const files = [
    ...await globFiles(join(root, "tmp"), "**/chats/*.json"),
    ...await globFiles(join(root, "tmp"), "**/chats/*.jsonl"),
  ]
  const records: UsageRecord[] = []
  const sessions = new Map<string, UsageSession>()

  for (const path of files) {
    let parsed: ParsedConversation | null = null
    try {
      parsed = parseGeminiConversation(await Bun.file(path).text(), basename(path))
    } catch {
      continue
    }
    if (parsed == null) continue
    const sessionId = `gemini:${parsed.sessionId}`

    for (const message of parsed.messages) {
      if (message.type !== "gemini") continue
      const usage = asObject(message.tokens) ?? asObject(message.usageMetadata)
      if (usage == null) continue
      const cached = numberValue(usage.cached) || numberValue(usage.cachedContentTokenCount)
      const prompt = numberValue(usage.input) || numberValue(usage.promptTokenCount)
      const candidates = numberValue(usage.output) || numberValue(usage.candidatesTokenCount)
      const thoughts = numberValue(usage.thoughts) || numberValue(usage.thoughtsTokenCount)
      const tool = numberValue(usage.tool) || numberValue(usage.toolUsePromptTokenCount)
      const tokens = {
        inputTokens: Math.max(0, prompt - cached) + tool,
        outputTokens: candidates + thoughts,
        cacheCreationTokens: 0,
        cacheReadTokens: cached,
      }
      if (Object.values(tokens).every((value) => value === 0)) continue
      const model = stringValue(message.model) ?? "gemini"
      const timestamp = stringValue(message.timestamp) ?? parsed.startTime ?? new Date().toISOString()
      const date = localDate(timestamp)
      records.push({
        date,
        source: "gemini",
        model,
        sessionId,
        ...tokens,
        costUsd: pricing.estimateCost("google", model, tokens),
        cacheSavingsUsd: pricing.estimateCacheSavings("google", model, tokens),
      })
      sessions.set(sessionId, { id: sessionId, source: "gemini", date })
    }
  }

  return { records, sessions: [...sessions.values()], files: files.length }
}

export function parseGeminiConversation(text: string, fallbackId = "session"): ParsedConversation | null {
  const trimmed = text.trim()
  if (trimmed === "") return null

  try {
    const full = asObject(JSON.parse(trimmed))
    if (full != null && Array.isArray(full.messages)) {
      return {
        sessionId: stringValue(full.sessionId) ?? fallbackId,
        startTime: stringValue(full.startTime),
        messages: full.messages.flatMap((message) => {
          const row = asObject(message)
          return row == null ? [] : [row]
        }),
      }
    }
  } catch {
    // JSONL is parsed below.
  }

  let sessionId = fallbackId
  let startTime: string | null = null
  const messages: Array<Record<string, unknown>> = []
  for (const line of trimmed.split("\n")) {
    let row: Record<string, unknown> | null = null
    try {
      row = asObject(JSON.parse(line))
    } catch {
      continue
    }
    if (row == null) continue
    const metadata = asObject(row.$set) ?? row
    sessionId = stringValue(metadata.sessionId) ?? sessionId
    startTime = stringValue(metadata.startTime) ?? startTime
    const rewindTo = stringValue(row.$rewindTo)
    if (rewindTo != null) {
      const index = messages.findIndex((message) => message.id === rewindTo)
      if (index >= 0) messages.splice(index + 1)
    } else if (stringValue(row.type) != null) {
      messages.push(row)
    }
  }
  return { sessionId, startTime, messages }
}
