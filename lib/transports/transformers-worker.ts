// Runs Transformers.js inference off the main thread so token generation does
// not block rendering. Instantiated from `transformers-js.ts` via `new Worker`.
import { TransformersJSWorkerHandler } from "@browser-ai/transformers-js"

const handler = new TransformersJSWorkerHandler()

self.onmessage = (event: MessageEvent) => {
  handler.onmessage(event)
}
