import { afterEach, describe, expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import type { TestRendererSetup } from "@opentui/core/testing"
import { act } from "react"
import { ScanBoot } from "./ScanBoot"

let setup: TestRendererSetup | null = null

afterEach(() => {
  act(() => { setup?.renderer.destroy() })
  setup = null
})

describe("ScanBoot", () => {
  test("renders only a centered compact scanner", async () => {
    setup = await testRender(
      <ScanBoot completed={3} total={6} width={80} />,
      { width: 80, height: 20 },
    )
    await setup.renderOnce()

    const frame = setup.captureCharFrame()
    expect(frame).toContain("scanning usage...")
    expect(frame).toContain("[##########          ]")
    expect(frame).not.toContain("Scanning Codex")
    expect(frame).not.toContain("files")
  })
})
