import type { Metric, RangeDays } from "../../domain/types"
import { shortDate } from "../../domain/dates"
import { Segmented } from "./Segmented"
import { useTheme } from "../ThemeContext"
import { PointerButton } from "./PointerButton"

export function Header({
  metric,
  range,
  days,
  compact,
  onMetricChange,
  onRangeChange,
  onRefresh,
}: {
  metric: Metric
  range: RangeDays
  days: string[]
  compact: boolean
  onMetricChange: (metric: Metric) => void
  onRangeChange: (range: RangeDays) => void
  onRefresh: () => void
}) {
  const theme = useTheme()
  const dateLabel = days.length === 0 ? "" : `${shortDate(days[0]!)} to ${shortDate(days.at(-1)!)}`
  return (
    <box flexDirection={compact ? "column" : "row"} justifyContent="space-between" width="100%" gap={1}>
      <text fg={theme.text}>
        <strong>yacu</strong>
        <span fg={theme.muted}>{`  /  ${dateLabel}`}</span>
      </text>
      <box flexDirection="row" gap={2}>
        <Segmented
          selected={metric}
          onChange={onMetricChange}
          options={[{ value: "cost", label: "Cost" }, { value: "tokens", label: "Tokens" }]}
        />
        <Segmented
          selected={range}
          onChange={onRangeChange}
          options={[
            { value: 1, label: "Past 24h" },
            { value: 7, label: "7 days" },
            { value: 30, label: "30 days" },
            { value: 90, label: "90 days" },
          ]}
        />
        <PointerButton label="r ↻" onPress={onRefresh} />
      </box>
    </box>
  )
}
