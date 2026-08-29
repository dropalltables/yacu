import { afterEach, describe, expect, test } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import type { TestRendererSetup } from "@opentui/core/testing"
import { act } from "react"
import { Segmented } from "./Segmented"

let setup: TestRendererSetup | null = null

afterEach(() => {
  act(() => { setup?.renderer.destroy() })
  setup = null
})

describe("Segmented", () => {
  test("changes value through a mouse click", async () => {
    let selected = "cost"
    setup = await testRender(
      <Segmented
        selected={selected}
        onChange={(value) => { selected = value }}
        options={[{ value: "cost", label: "Cost" }, { value: "tokens", label: "Tokens" }]}
      />,
      { width: 24, height: 2, autoFocus: false },
    )
    await setup.renderOnce()

    await act(async () => { await setup!.mockMouse.click(9, 0) })

    expect(selected).toBe("tokens")
    expect(setup.renderer.getSelection()).toBeNull()
  })
})
