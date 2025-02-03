"use client"

import { Fab } from "./fab"
import { useApna } from "@apna/sdk"

export function FabWithHighlight() {
  const { toggleHighlight } = useApna()

  return (
    <Fab onPublish={() => {
      console.log('here')
      toggleHighlight()
      return Promise.resolve()
    }} />
  )
}