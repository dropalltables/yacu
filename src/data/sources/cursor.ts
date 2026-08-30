import { stat } from "node:fs/promises"
import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"
import { countTokens } from "gpt-tokenizer/encoding/o200k_base"
import { localDate } from "../../domain/dates"
import type { UsageRecord, UsageSession } from "../../domain/types"
import type { PricingCatalog } from "../pricing"
import { asObject, forEachJsonLine, globFiles, stringValue } from "../jsonl"
import type { SourceLoadResult } from "../types"

type TranscriptCount = {
  inputTokens: number
  outputTokens: number
}

export async function loadCursorUsage(pricing: PricingCatalog): Promise<SourceLoadResult> {
  const root = process.env.CURSOR_CONFIG_DIR ?? join(homedir(), ".cursor")
  const files = await globFiles(join(root, "projects"), "**/agent-transcripts/**/*.jsonl")
  const fallbackModel = await readConfiguredModel(join(root, "cli-config.json"))
  const records: UsageRecord[] = []
  const sessions: UsageSession[] = []

  for (const path of files) {
    const counts: TranscriptCount = { inputTokens: 0, outputTokens: 0 }
    let model = fallbackModel
    await forEachJsonLine(path, (unknownValue) => {
      const value = asObject(unknownValue)
      const message = asObject(value?.message) ?? value
      const role = stringValue(value?.role) ?? stringValue(message?.role)
      model = stringValue(value?.model) ?? stringValue(message?.model) ?? model
      const tokens = countContent(message?.content)
      if (role === "user") counts.inputTokens += tokens
      if (role === "assistant") counts.outputTokens += tokens
    })

    if (counts.inputTokens + counts.outputTokens === 0) continue
    const timestamp = (await stat(path)).mtime
    const date = localDate(timestamp)
    const rawSessionId = basename(dirname(path))
    const sessionId = `cursor:${rawSessionId}`
    const tokens = { ...counts, cacheCreationTokens: 0, cacheReadTokens: 0 }
    records.push({
      date,
      source: "cursor",
      model,
      sessionId,
      ...tokens,
      costUsd: pricing.estimateCost("cursor", model, tokens),
      cacheSavingsUsd: 0,
    })
    sessions.push({ id: sessionId, source: "cursor", date })
  }

  return { records, sessions, files: files.length }
}

export function countContent(value: unknown): number {
  if (typeof value === "string") return countTokens(value)
  if (!Array.isArray(value)) return 0
  return value.reduce((total, item) => {
    const part = asObject(item)
    if (part == null) return total
    const text = stringValue(part.text)
    if (text != null) return total + countTokens(text)
    if (part.type === "tool_use") return total + countTokens(JSON.stringify({ name: part.name, input: part.input }))
    return total
  }, 0)
}

async function readConfiguredModel(path: string): Promise<string> {
  try {
    const config = asObject(await Bun.file(path).json())
    const model = asObject(config?.model)
    const selected = asObject(config?.selectedModel)
    return stringValue(model?.modelId)
      ?? stringValue(model?.id)
      ?? stringValue(selected?.modelId)
      ?? stringValue(selected?.id)
      ?? "cursor-agent"
  } catch {
    return "cursor-agent"
  }
}
