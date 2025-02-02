"use client"

import { Fab } from "./fab"
import { useDynamicComponent } from "./with-dynamic-component"

export function FabWithHighlight() {
  const { toggleHighlight } = useDynamicComponent()

  return (
    <Fab onPublish={() => {
      toggleHighlight()
      return Promise.resolve()
    }} />
  )
}