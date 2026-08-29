import { useEffect, useState } from "react"
import { RGBA, type CliRenderer, type TerminalColors, type ThemeMode } from "@opentui/core"
import type { SourceId } from "../domain/types"

export type Theme = {
  mode: ThemeMode
  bg: RGBA
  panel: RGBA
  hover: RGBA
  selected: RGBA
  text: RGBA
  onHover: RGBA
  onSelected: RGBA
  muted: RGBA
  faint: RGBA
  accent: RGBA
  error: RGBA
  progress: RGBA
  onProgress: RGBA
  sources: Record<SourceId, RGBA>
}

const dark = createTheme("dark")
const light = createTheme("light")

export function terminalTheme(mode: ThemeMode): Theme {
  return mode === "light" ? light : dark
}

export function useTerminalTheme(renderer: CliRenderer): Theme {
  const [mode, setMode] = useState<ThemeMode>(renderer.themeMode ?? colorFgBgMode() ?? "dark")

  useEffect(() => {
    const update = (next: ThemeMode) => setMode(next)
    const updatePalette = (colors: TerminalColors) => {
      const next = backgroundMode(colors.defaultBackground)
      if (next != null) setMode(next)
    }
    renderer.on("theme_mode", update)
    renderer.on("palette", updatePalette)
    void renderer.waitForThemeMode(300).then((next) => {
      if (next != null) setMode(next)
    })
    void renderer.getPalette({ size: 16, timeout: 300 }).then(updatePalette).catch(() => {})
    return () => {
      renderer.off("theme_mode", update)
      renderer.off("palette", updatePalette)
    }
  }, [renderer])

  return terminalTheme(mode)
}

function colorFgBgMode(): ThemeMode | null {
  const index = Number(process.env.COLORFGBG?.split(";").at(-1))
  if (!Number.isInteger(index)) return null
  return index === 7 || index > 8 ? "light" : "dark"
}

function backgroundMode(background: string | null): ThemeMode | null {
  if (background == null) return null
  const hex = background.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
  if (hex == null) return null
  const red = Number.parseInt(hex[1]!, 16)
  const green = Number.parseInt(hex[2]!, 16)
  const blue = Number.parseInt(hex[3]!, 16)
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance >= 0.55 ? "light" : "dark"
}

function createTheme(mode: ThemeMode): Theme {
  const isLight = mode === "light"
  const textSnapshot = isLight ? "#202020" : "#ededed"
  const backgroundSnapshot = isLight ? "#fafafa" : "#1e1e1e"
  return {
    mode,
    bg: RGBA.defaultBackground(backgroundSnapshot),
    panel: RGBA.defaultBackground(backgroundSnapshot),
    hover: RGBA.fromHex(isLight ? "#e4e4e4" : "#303030"),
    selected: RGBA.fromHex(isLight ? "#d8d8d8" : "#3a3a3a"),
    text: RGBA.defaultForeground(textSnapshot),
    onHover: RGBA.defaultForeground(textSnapshot),
    onSelected: RGBA.defaultForeground(textSnapshot),
    muted: RGBA.fromHex(isLight ? "#666666" : "#858585"),
    faint: RGBA.fromHex(isLight ? "#c8c8c8" : "#424242"),
    accent: RGBA.fromHex(isLight ? "#8a5a00" : "#d7a94a"),
    error: RGBA.fromHex(isLight ? "#a52a2a" : "#dc6b6b"),
    progress: RGBA.fromHex(isLight ? "#1f9d68" : "#35c98b"),
    onProgress: RGBA.fromHex(isLight ? "#ffffff" : "#111111"),
    sources: {
      claude: RGBA.fromHex(isLight ? "#a84324" : "#dc7957"),
      codex: RGBA.defaultForeground(textSnapshot),
      cursor: RGBA.fromHex(isLight ? "#713b91" : "#c58be2"),
      gemini: RGBA.fromHex(isLight ? "#245fa8" : "#77a7e8"),
      grok: RGBA.fromHex(isLight ? "#5e5e5e" : "#a5a5a5"),
      opencode: RGBA.fromHex(isLight ? "#287a73" : "#72a7a0"),
    },
  }
}
