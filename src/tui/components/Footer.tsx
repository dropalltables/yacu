import { useTheme } from "../ThemeContext"

export function Footer({ loading }: { loading: boolean }) {
  const theme = useTheme()
  return (
    <box width="100%" flexDirection="row" justifyContent="space-between" backgroundColor={theme.panel} paddingX={1}>
      <text fg={theme.muted}>c cost/tokens   1-4 range   b breakdown   r refresh   q quit</text>
      <text fg={loading ? theme.accent : theme.muted}>{loading ? "loading" : "local"}</text>
    </box>
  )
}
