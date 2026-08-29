import { useEffect, useMemo, useState } from "react"
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react"
import { buildDashboard } from "../domain/aggregate"
import { SOURCE_ORDER, type BreakdownMode, type Metric, type RangeDays, type SourceId, type UsageDataset } from "../domain/types"
import { loadUsageDataset } from "../data/load"
import type { ScanProgress } from "../data/types"
import { Header } from "./components/Header"
import { Summary } from "./components/Summary"
import { Chart } from "./components/Chart"
import { Totals } from "./components/Totals"
import { Breakdown } from "./components/Breakdown"
import { Footer } from "./components/Footer"
import { ScanBoot } from "./components/ScanBoot"
import { ThemeProvider } from "./ThemeContext"
import { useTerminalTheme } from "./theme"

const RANGES: RangeDays[] = [1, 7, 30, 90]

export function App() {
  const renderer = useRenderer()
  const theme = useTerminalTheme(renderer)
  const { width, height } = useTerminalDimensions()
  const [dataset, setDataset] = useState<UsageDataset | null>(null)
  const [metric, setMetric] = useState<Metric>("cost")
  const [range, setRange] = useState<RangeDays>(30)
  const [breakdown, setBreakdown] = useState<BreakdownMode>("model")
  const [visibleSources, setVisibleSources] = useState<Set<SourceId>>(() => new Set(SOURCE_ORDER))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scanLog, setScanLog] = useState<ScanProgress[]>([])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    if (dataset == null) setScanLog([])
    try {
      setDataset(await loadUsageDataset((progress) => {
        if (progress.status !== "scanning") {
          setScanLog((current) => [...current, progress])
        }
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const changeRange = (next: RangeDays) => {
    setRange(next)
    setSelectedDay(null)
  }

  const selectDay = (day: string | null) => {
    setSelectedDay(day)
    if (day != null) setBreakdown("day")
  }

  const toggleSource = (source: SourceId) => {
    setVisibleSources((current) => {
      const next = new Set(current)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })
  }

  useKeyboard((key) => {
    if (key.name === "q" || key.name === "escape") renderer.destroy()
    else if (key.name === "c") setMetric((value) => value === "cost" ? "tokens" : "cost")
    else if (key.name === "b") setBreakdown((value) => value === "model" ? "day" : "model")
    else if (key.name === "r") void refresh()
    else if (["1", "2", "3", "4"].includes(key.name)) changeRange(RANGES[Number(key.name) - 1]!)
    else if (key.name === "left" || key.name === "right") {
      const index = RANGES.indexOf(range)
      const next = key.name === "left" ? Math.max(0, index - 1) : Math.min(RANGES.length - 1, index + 1)
      changeRange(RANGES[next]!)
    }
  })

  const dashboard = useMemo(() => dataset == null ? null : buildDashboard(dataset, range, metric), [dataset, range, metric])
  const compact = width < 100
  const wide = width >= 112
  const contentWidth = Math.max(40, width - 4)
  const summaryWidth = wide ? Math.min(45, Math.floor(contentWidth * 0.34)) : contentWidth
  const chartWidth = wide ? contentWidth - summaryWidth - 3 : contentWidth

  return (
    <ThemeProvider theme={theme}>
    <box width="100%" height="100%" flexDirection="column" backgroundColor={theme.bg}>
      <scrollbox
        flexGrow={1}
        width="100%"
        paddingX={2}
        paddingTop={1}
        scrollY={dashboard != null}
        viewportCulling
        scrollbarOptions={{
          trackOptions: { backgroundColor: theme.bg, foregroundColor: theme.muted },
          arrowOptions: { backgroundColor: theme.bg, foregroundColor: theme.muted },
        }}
      >
        {dashboard == null ? (
          error == null
            ? <ScanBoot log={scanLog} width={contentWidth} />
            : <text fg={theme.error}>{`Error: ${error}`}</text>
        ) : (
          <box flexDirection="column" width="100%" gap={2}>
            <Header
              metric={metric}
              range={range}
              days={dashboard.days}
              compact={compact}
              onMetricChange={setMetric}
              onRangeChange={changeRange}
              onRefresh={() => void refresh()}
            />
            {dashboard.records.length === 0 ? (
              <text fg={theme.muted}>No local usage found</text>
            ) : (
              <>
                <box flexDirection={wide ? "row" : "column"} width="100%" gap={3}>
                  <box width={wide ? summaryWidth : "100%"}>
                    <Summary
                      dashboard={dashboard}
                      metric={metric}
                      visibleSources={visibleSources}
                      onToggleSource={toggleSource}
                    />
                  </box>
                  <box width={wide ? chartWidth : "100%"}>
                    <Chart
                      dashboard={dashboard}
                      metric={metric}
                      width={chartWidth}
                      height={wide ? 11 : 8}
                      visibleSources={visibleSources}
                      selectedDay={selectedDay}
                      onSelectDay={selectDay}
                    />
                  </box>
                </box>
                <Totals dashboard={dashboard} compact={compact} />
                <Breakdown
                  dashboard={dashboard}
                  mode={breakdown}
                  metric={metric}
                  width={contentWidth}
                  selectedDay={selectedDay}
                  onModeChange={setBreakdown}
                  onSelectDay={selectDay}
                />
              </>
            )}
            {dataset?.errors.length ? <text fg={theme.error}>{dataset.errors.join(" · ")}</text> : null}
            <box height={1} />
          </box>
        )}
      </scrollbox>
      {dashboard == null ? null : <Footer loading={loading} />}
    </box>
    </ThemeProvider>
  )
}
