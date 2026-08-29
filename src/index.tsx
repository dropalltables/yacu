#!/usr/bin/env bun
import { createCliRenderer, RGBA } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./tui/App"

const renderer = await createCliRenderer({
  backgroundColor: RGBA.defaultBackground("#1e1e1e"),
  exitOnCtrlC: true,
  targetFps: 30,
  useMouse: true,
  enableMouseMovement: true,
  autoFocus: false,
})

createRoot(renderer).render(<App />)
