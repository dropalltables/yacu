import { datesInRange } from "./dates"
import {
  SOURCE_ORDER,
  type Metric,
  type RangeDays,
  type SourceId,
  type UsageDataset,
  type UsageRecord,
} from "./types"

type Totals = {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  processedTokens: number
  costUsd: number
  cacheSavingsUsd: number
}

export type ProviderStat = Totals & {
  source: SourceId
  sessions: number
  share: number
}

export type BreakdownRow = Totals & {
  key: string
  label: string
  source?: SourceId
  share: number
}

export type Dashboard = {
  days: string[]
  records: UsageRecord[]
  totals: Totals
  sessions: number
  providers: ProviderStat[]
  models: BreakdownRow[]
  daily: BreakdownRow[]
  series: Record<SourceId, number[]>
}

function emptyTotals(): Totals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    processedTokens: 0,
    costUsd: 0,
    cacheSavingsUsd: 0,
  }
}

function addRecord(target: Totals, record: UsageRecord): void {
  target.inputTokens += record.inputTokens
  target.outputTokens += record.outputTokens
  target.cacheCreationTokens += record.cacheCreationTokens
  target.cacheReadTokens += record.cacheReadTokens
  target.processedTokens +=
    record.inputTokens + record.outputTokens + record.cacheCreationTokens + record.cacheReadTokens
  target.costUsd += record.costUsd
  target.cacheSavingsUsd += record.cacheSavingsUsd
}

function metricValue(totals: Totals, metric: Metric): number {
  return metric === "cost" ? totals.costUsd : totals.processedTokens
}

export function buildDashboard(dataset: UsageDataset, range: RangeDays, metric: Metric): Dashboard {
  const days = datesInRange(range)
  const dateSet = new Set(days)
  const records = dataset.records.filter((record) => dateSet.has(record.date))
  const sessions = dataset.sessions.filter((session) => dateSet.has(session.date))
  const totals = emptyTotals()
  for (const record of records) addRecord(totals, record)

  const providerMap = new Map<SourceId, Totals>()
  const providerSessions = new Map<SourceId, Set<string>>()
  for (const record of records) {
    const aggregate = providerMap.get(record.source) ?? emptyTotals()
    addRecord(aggregate, record)
    providerMap.set(record.source, aggregate)
  }
  for (const session of sessions) {
    const ids = providerSessions.get(session.source) ?? new Set<string>()
    ids.add(session.id)
    providerSessions.set(session.source, ids)
  }
  const metricTotal = metricValue(totals, metric)
  const providers = SOURCE_ORDER.filter((source) => providerMap.has(source)).map((source) => {
    const values = providerMap.get(source) ?? emptyTotals()
    return {
      ...values,
      source,
      sessions: providerSessions.get(source)?.size ?? 0,
      share: metricTotal > 0 ? metricValue(values, metric) / metricTotal : 0,
    }
  })

  const modelMap = new Map<string, BreakdownRow>()
  for (const record of records) {
    const key = `${record.source}\0${record.model}`
    const row = modelMap.get(key) ?? {
      ...emptyTotals(),
      key,
      label: record.model,
      source: record.source,
      share: 0,
    }
    addRecord(row, record)
    modelMap.set(key, row)
  }
  const models = [...modelMap.values()]
    .map((row) => ({ ...row, share: metricTotal > 0 ? metricValue(row, metric) / metricTotal : 0 }))
    .sort((a, b) => metricValue(b, metric) - metricValue(a, metric))

  const dailyMap = new Map<string, BreakdownRow>()
  for (const day of days) {
    dailyMap.set(day, { ...emptyTotals(), key: day, label: day, share: 0 })
  }
  for (const record of records) addRecord(dailyMap.get(record.date)!, record)
  const daily = [...dailyMap.values()]
    .map((row) => ({ ...row, share: metricTotal > 0 ? metricValue(row, metric) / metricTotal : 0 }))
    .sort((a, b) => metricValue(b, metric) - metricValue(a, metric))

  const series = Object.fromEntries(
    SOURCE_ORDER.map((source) => {
      const values = days.map((day) => {
        const dayTotals = emptyTotals()
        for (const record of records) {
          if (record.source === source && record.date === day) addRecord(dayTotals, record)
        }
        return metricValue(dayTotals, metric)
      })
      return [source, values]
    }),
  ) as Record<SourceId, number[]>

  return { days, records, totals, sessions: new Set(sessions.map((session) => session.id)).size, providers, models, daily, series }
}
