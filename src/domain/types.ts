export type SourceId = "claude" | "codex" | "cursor" | "gemini" | "opencode" | "grok"

export type UsageRecord = {
  date: string
  source: SourceId
  model: string
  sessionId?: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  costUsd: number
  cacheSavingsUsd: number
}

export type UsageSession = {
  id: string
  source: SourceId
  date: string
}

export type UsageDataset = {
  records: UsageRecord[]
  sessions: UsageSession[]
  errors: string[]
  scannedAt: Date
}

export type Metric = "cost" | "tokens"
export type RangeDays = 1 | 7 | 30 | 90
export type BreakdownMode = "model" | "day"

export type SourceMeta = {
  id: SourceId
  label: string
  mark: string
}

export const SOURCE_META: Record<SourceId, SourceMeta> = {
  claude: { id: "claude", label: "Claude Code", mark: "*" },
  codex: { id: "codex", label: "Codex", mark: "o" },
  cursor: { id: "cursor", label: "Cursor", mark: ">" },
  gemini: { id: "gemini", label: "Gemini CLI", mark: "g" },
  grok: { id: "grok", label: "Grok Build", mark: "x" },
  opencode: { id: "opencode", label: "OpenCode", mark: "+" },
}

export const SOURCE_ORDER: SourceId[] = ["codex", "claude", "cursor", "gemini", "grok", "opencode"]
