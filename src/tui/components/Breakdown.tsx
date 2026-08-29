import { useState } from "react"
import type { MouseEvent } from "@opentui/core"
import type { Dashboard } from "../../domain/aggregate"
import type { BreakdownMode, Metric } from "../../domain/types"
import { SOURCE_META } from "../../domain/types"
import { Segmented } from "./Segmented"
import { formatMetric, percent, truncate } from "../format"
import { useTheme } from "../ThemeContext"
import { usePointer } from "../usePointer"

export function Breakdown({
  dashboard,
  mode,
  metric,
  width,
  selectedDay,
  onModeChange,
  onSelectDay,
}: {
  dashboard: Dashboard
  mode: BreakdownMode
  metric: Metric
  width: number
  selectedDay: string | null
  onModeChange: (mode: BreakdownMode) => void
  onSelectDay: (day: string | null) => void
}) {
  const theme = useTheme()
  const [hovered, setHovered] = useState<string | null>(null)
  const { pointerOver, pointerOut } = usePointer()
  const rows = mode === "model" ? dashboard.models : dashboard.daily
  const nameWidth = Math.max(18, width - 42)
  return (
    <box flexDirection="column" width="100%" gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text}><strong>Breakdown</strong></text>
        <Segmented
          selected={mode}
          onChange={onModeChange}
          options={[{ value: "model", label: "Model" }, { value: "day", label: "Day" }]}
        />
      </box>
      <box flexDirection="row">
        <text fg={theme.muted} width={nameWidth}>{mode === "model" ? "Model" : "Day"}</text>
        <text fg={theme.muted} width={15}>{metric === "cost" ? "Cost" : "Tokens"}</text>
        <text fg={theme.muted} width={12}>Share</text>
        <text fg={theme.muted}>Tokens</text>
      </box>
      {rows.slice(0, 18).map((row) => {
        const value = metric === "cost" ? row.costUsd : row.processedTokens
        const color = row.source == null ? theme.text : theme.sources[row.source]
        const mark = row.source == null ? " " : SOURCE_META[row.source].mark
        const interactive = mode === "day"
        const selected = interactive && selectedDay === row.key
        const hot = interactive && hovered === row.key
        const select = interactive ? (event: MouseEvent) => {
          if (event.button !== 0) return
          event.stopPropagation()
          onSelectDay(selected ? null : row.key)
        } : undefined
        return (
          <box
            key={row.key}
            flexDirection="row"
            backgroundColor={selected ? theme.selected : hot ? theme.hover : theme.bg}
            onMouseDown={select}
            onMouseOver={interactive ? () => {
              setHovered(row.key)
              pointerOver()
            } : undefined}
            onMouseOut={interactive ? () => {
              setHovered(null)
              pointerOut()
            } : undefined}
          >
            <text selectable={!interactive} fg={selected ? theme.onSelected : hot ? theme.onHover : color} width={nameWidth}>{`${mark} ${truncate(row.label, nameWidth - 2)}`}</text>
            <text selectable={!interactive} fg={selected ? theme.onSelected : hot ? theme.onHover : theme.text} width={15}>{formatMetric(value, metric)}</text>
            <text selectable={!interactive} fg={selected ? theme.onSelected : hot ? theme.onHover : theme.muted} width={12}>{percent(row.share)}</text>
            <text selectable={!interactive} fg={selected ? theme.onSelected : hot ? theme.onHover : theme.muted}>{formatMetric(row.processedTokens, "tokens")}</text>
          </box>
        )
      })}
    </box>
  )
}
