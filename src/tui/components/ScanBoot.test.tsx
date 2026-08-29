import { afterEach, describe, expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import type { TestRendererSetup } from "@opentui/core/testing"
import { act } from "react"
import type { ScanProgress } from "../../data/types"
import { terminalTheme } from "../theme"
import { ScanBoot, scanLine } from "./ScanBoot"

let setup: TestRendererSetup | null = null

afterEach(() => {
  act(() => { setup?.renderer.destroy() })
  setup = null
})

const progress: ScanProgress = {
  source: "codex",
  label: "Codex",
  status: "done",
  completed: 3,
  total: 6,
  files: 241,
  records: 23_812,
  sessions: 159,
}

describe("ScanBoot", () => {
  test("renders an apt-style stream and colored progress prefix", async () => {
    setup = await testRender(<ScanBoot log={[progress]} width={80} />, { width: 80, height: 6 })
    await setup.renderOnce()

    const frame = setup.captureCharFrame()
    expect(frame).toContain("Reading local usage...")
    expect(frame).toContain("Scanning Codex... 241 files, 23812 records, 159 sessions")
    expect(frame).toContain("Progress: [ 50%]")
    const colored = setup.captureSpans().lines.flatMap((line) => line.spans)
      .some((span) => span.bg.equals(terminalTheme("dark").progress))
    expect(colored).toBeTrue()
  })

  test("formats failures as stream entries", () => {
    expect(scanLine({ ...progress, status: "error", error: "unreadable" }))
      .toBe("Scanning Codex... failed: unreadable")
  })
})
