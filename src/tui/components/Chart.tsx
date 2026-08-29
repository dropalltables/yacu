import { useMemo, useState } from "react"
import type { MouseEvent } from "@opentui/core"
import type { Dashboard } from "../../domain/aggregate"
import { shortDate } from "../../domain/dates"
import { SOURCE_META, SOURCE_ORDER, type Metric, type SourceId } from "../../domain/types"
import { chartColumnForDay, dayIndexAtColumn, renderBrailleChart } from "../chart"
import { formatAxis, formatMetric } from "../format"
import { useTheme } from "../ThemeContext"
import { usePointer } from "../usePointer"

export function Chart({
  dashboard,
  metric,
  width,
  visibleSources,
  selectedDay,
  onSelectDay,
  height = 11,
}: {
  dashboard: Dashboard
  metric: Metric
  width: number
  visibleSources: Set<SourceId>
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
  height?: number
}) {
  const theme = useTheme()
  const labelWidth = 9
  const graphWidth = Math.max(8, width - labelWidth - 1)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { pointerOver, pointerOut } = usePointer("crosshair")
  const selectedIndex = selectedDay == null ? -1 : dashboard.days.indexOf(selectedDay)
  const activeIndex = hoveredIndex ?? (selectedIndex >= 0 ? selectedIndex : null)
  const highlightColumn = activeIndex == null
    ? undefined
    : chartColumnForDay(activeIndex, graphWidth, dashboard.days.length)

  const visibleSeries = useMemo(() => Object.fromEntries(
    SOURCE_ORDER.map((source) => [
      source,
      visibleSources.has(source)
        ? dashboard.series[source]
        : dashboard.series[source].map(() => 0),
    ]),
  ) as Record<SourceId, number[]>, [dashboard.series, visibleSources])
  const chart = renderBrailleChart(
    visibleSeries,
    graphWidth,
    height,
    highlightColumn,
    theme.selected,
    theme.onSelected,
    theme,
  )

  const indexFromEvent = (event: MouseEvent): number => {
    const start = event.currentTarget?.screenX ?? event.x
    return dayIndexAtColumn(event.x - start, graphWidth, dashboard.days.length)
  }

  const move = (event: MouseEvent) => setHoveredIndex(indexFromEvent(event))
  const select = (event: MouseEvent) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const index = indexFromEvent(event)
    const day = dashboard.days[index] ?? null
    onSelectDay(day === selectedDay ? null : day)
  }

  return (
    <box flexDirection="column" width="100%">
      <text fg={theme.text}>{`Daily ${metric}`}</text>
      <box height={1}>
        {activeIndex == null ? null : (
          <ChartPoint
            dashboard={dashboard}
            metric={metric}
            index={activeIndex}
            visibleSources={visibleSources}
            pinned={hoveredIndex == null && selectedIndex === activeIndex}
          />
        )}
      </box>
      <box flexDirection="row" height={height}>
        <box flexDirection="column" width={labelWidth}>
          {chart.rows.map((_, index) => {
            const ratio = 1 - index / Math.max(1, chart.rows.length - 1)
            const show = index === 0 || index === Math.floor(chart.rows.length / 2) || index === chart.rows.length - 1
            const label = show ? formatAxis(chart.max * ratio, metric) : ""
            return <text key={index} fg={theme.muted} height={1}>{label.padStart(labelWidth - 1)}</text>
          })}
        </box>
        <box
          focusable
          flexDirection="column"
          width={graphWidth}
          height={height}
          onMouseMove={move}
          onMouseDown={select}
          onMouseOver={pointerOver}
          onMouseOut={() => {
            setHoveredIndex(null)
            pointerOut()
          }}
        >
          {chart.rows.map((segments, index) => (
            <text key={index} height={1} selectable={false}>
              {segments.map((segment, segmentIndex) => (
                <span key={segmentIndex} fg={segment.color} bg={segment.background}>
                  {segment.text}
                </span>
              ))}
            </text>
          ))}
        </box>
      </box>
      <box flexDirection="row" marginLeft={labelWidth} justifyContent="space-between" width={graphWidth}>
        <text fg={theme.muted}>{shortDate(dashboard.days[0] ?? "")}</text>
        <text fg={theme.muted}>{shortDate(dashboard.days[Math.floor(dashboard.days.length / 2)] ?? "")}</text>
        <text fg={theme.muted}>{shortDate(dashboard.days.at(-1) ?? "")}</text>
      </box>
    </box>
  )
}

function ChartPoint({
  dashboard,
  metric,
  index,
  visibleSources,
  pinned,
}: {
  dashboard: Dashboard
  metric: Metric
  index: number
  visibleSources: Set<SourceId>
  pinned: boolean
}) {
  const theme = useTheme()
  const values = SOURCE_ORDER
    .filter((source) => visibleSources.has(source))
    .map((source) => ({ source, value: dashboard.series[source][index] ?? 0 }))
    .filter(({ value }) => value > 0)
  const total = values.reduce((sum, { value }) => sum + value, 0)

  return (
    <text height={1}>
      <span fg={theme.text}>{shortDate(dashboard.days[index] ?? "")}</span>
      <span fg={theme.muted}>{`  ${formatMetric(total, metric)}`}</span>
      {values.map(({ source, value }) => (
        <span key={source} fg={theme.sources[source]}>
          {`  ${SOURCE_META[source].mark} ${formatMetric(value, metric)}`}
        </span>
      ))}
      {pinned ? <span fg={theme.muted}>{"  pinned"}</span> : null}
    </text>
  )
}
