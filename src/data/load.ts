import { SOURCE_META, type SourceId, type UsageDataset } from "../domain/types"
import { loadClaudeUsage } from "./sources/claude"
import { loadCodexUsage } from "./sources/codex"
import { loadCursorUsage } from "./sources/cursor"
import { loadGeminiUsage } from "./sources/gemini"
import { loadGrokUsage } from "./sources/grok"
import { loadOpenCodeUsage } from "./sources/opencode"
import { loadPricingCatalog, type PricingCatalog } from "./pricing"
import type { ScanProgressHandler, SourceLoadResult } from "./types"

type SourceLoader = {
  id: SourceId
  load: (pricing: PricingCatalog) => Promise<SourceLoadResult>
}

const SOURCES: SourceLoader[] = [
  { id: "claude", load: loadClaudeUsage },
  { id: "codex", load: loadCodexUsage },
  { id: "cursor", load: loadCursorUsage },
  { id: "gemini", load: loadGeminiUsage },
  { id: "opencode", load: loadOpenCodeUsage },
  { id: "grok", load: loadGrokUsage },
]

export async function loadUsageDataset(onProgress?: ScanProgressHandler): Promise<UsageDataset> {
  const pricing = await loadPricingCatalog()
  let completed = 0
  const results = await Promise.all(SOURCES.map(async (source) => {
    const common = { source: source.id, label: SOURCE_META[source.id].label, total: SOURCES.length }
    onProgress?.({ ...common, status: "scanning", completed })
    try {
      const value = await source.load(pricing)
      completed += 1
      onProgress?.({
        ...common,
        status: "done",
        completed,
        files: value.files,
        records: value.records.length,
        sessions: value.sessions.length,
      })
      return { value, error: null }
    } catch (cause) {
      completed += 1
      const error = cause instanceof Error ? cause.message : String(cause)
      onProgress?.({ ...common, status: "error", completed, error })
      return { value: null, error }
    }
  }))
  const records = results.flatMap((result) => result.value?.records ?? [])
  const sessions = results.flatMap((result) => result.value?.sessions ?? [])
  const errors = results.flatMap((result) => result.error == null ? [] : [result.error])
  return { records, sessions, errors, scannedAt: new Date() }
}
