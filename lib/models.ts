import { type WorkerLoadOptions } from "@browser-ai/transformers-js"

// Gateway models: see https://vercel.com/ai-gateway/models.
// Transformers.js models run fully on-device and never hit `/api/chat`.
export type ModelProvider = "gateway" | "transformers-js"

// Load options for a Transformers.js model, plus how the template drives it.
export interface TransformersConfig extends Omit<WorkerLoadOptions, "modelId"> {
  /** Run the model in a Web Worker instead of on the main thread. */
  supportsWorker: boolean
  /** The model can emit `<think>` reasoning. */
  enableThinking?: boolean
  /** The chat template pre-fills the opening `<think>` tag. */
  thinkingPrefilled?: boolean
}

export interface ChatModel {
  id: string
  name: string
  provider: ModelProvider
  /** Required when `provider` is `"transformers-js"`. */
  transformers?: TransformersConfig
}

export const MODELS: ChatModel[] = [
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "gateway",
  },
  { id: "openai/gpt-5.6-terra", name: "GPT 5.6 Terra", provider: "gateway" },
  {
    id: "LiquidAI/LFM2.5-2.6B-ONNX",
    name: "LFM2.5 2.6B (on-device)",
    provider: "transformers-js",
    transformers: {
      device: "webgpu",
      dtype: "q4f16",
      enableThinking: true,
      thinkingPrefilled: true,
      isVisionModel: false,
      supportsWorker: true,
    },
  },
]

export const DEFAULT_MODEL = MODELS[0].id

export function getModel(id: string) {
  return MODELS.find((model) => model.id === id)
}

export function isTransformersModel(id: string) {
  return getModel(id)?.provider === "transformers-js"
}

// Only server-side (gateway) models may be requested through the API route.
export function isModelAllowed(id: string) {
  return getModel(id)?.provider === "gateway"
}
