import type { MousePointerStyle } from "@opentui/core"
import { useRenderer } from "@opentui/react"

export function usePointer(style: MousePointerStyle = "pointer") {
  const renderer = useRenderer()

  return {
    pointerOver: () => renderer.setMousePointer(style),
    pointerOut: () => renderer.setMousePointer("default"),
  }
}
