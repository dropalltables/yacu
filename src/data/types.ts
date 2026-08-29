import type { SourceId, UsageRecord, UsageSession } from "../domain/types"

export type SourceLoadResult = {
  records: UsageRecord[]
  sessions: UsageSession[]
  files: number
}

export type ScanStatus = "pending" | "scanning" | "done" | "error"

export type ScanProgress = {
  source: SourceId
  label: string
  status: ScanStatus
  completed: number
  total: number
  files?: number
  records?: number
  sessions?: number
  error?: string
}

export type ScanProgressHandler = (progress: ScanProgress) => void
