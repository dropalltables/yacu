import { useState } from "react"
import type { MouseEvent } from "@opentui/core"
import type { Dashboard } from "../../domain/aggregate"
import type { Metric, SourceId } from "../../domain/types"
import { SOURCE_META } from "../../domain/types"
import { formatCompact, formatMetric, formatMoney, percent } from "../format"
import { useTheme } from "../ThemeContext"
import { usePointer } from "../usePointer"

export function Summary({
  dashboard,
  metric,
  visibleSources,
  onToggleSource,
}: {
  dashboard: Dashboard
  metric: Metric
  visibleSources: Set<SourceId>
  onToggleSource: (source: SourceId) => void
}) {
  const theme = useTheme()
  const [hovered, setHovered] = useState<SourceId | null>(null)
  const { pointerOver, pointerOut } = usePointer()
  const total = metric === "cost" ? formatMoney(dashboard.totals.costUsd) : formatCompact(dashboard.totals.processedTokens)
  return (
    <box flexDirection="column" width="100%" gap={1}>
      <text fg={theme.text}><strong>{total}</strong></text>
      <text fg={theme.muted}>{`${dashboard.sessions.toLocaleString("en-US")} sessions · models.dev estimate`}</text>
      <box height={1} />
      {dashboard.providers.map((provider) => {
        const meta = SOURCE_META[provider.source]
        const value = metric === "cost" ? provider.costUsd : provider.processedTokens
        const visible = visibleSources.has(provider.source)
        const hot = hovered === provider.source
        const toggle = (event: MouseEvent) => {
          if (event.button !== 0) return
          event.stopPropagation()
          onToggleSource(provider.source)
        }
        return (
          <box
            key={provider.source}
            flexDirection="column"
            marginBottom={1}
            backgroundColor={hot ? theme.hover : theme.bg}
            opacity={visible ? 1 : 0.45}
            onMouseDown={toggle}
            onMouseOver={() => {
              setHovered(provider.source)
              pointerOver()
            }}
            onMouseOut={() => {
              setHovered(null)
              pointerOut()
            }}
          >
            <box flexDirection="row" justifyContent="space-between">
              <text selectable={false} fg={hot ? theme.onHover : theme.sources[provider.source]}>{`${meta.mark} `}<span fg={hot ? theme.onHover : theme.text}>{meta.label}</span><span fg={hot ? theme.onHover : theme.muted}>{` ${provider.sessions} sessions`}</span></text>
              <text selectable={false} fg={hot ? theme.onHover : theme.text}>{formatMetric(value, metric)}</text>
            </box>
            <text selectable={false} fg={hot ? theme.onHover : theme.muted}>{`${percent(provider.share)} of ${metric} · ${formatCompact(provider.processedTokens)} tokens`}</text>
          </box>
        )
      })}
    </box>
  )
}
