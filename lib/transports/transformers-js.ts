"use client"

import {
  transformersJS,
  type TransformersJSLanguageModel,
} from "@browser-ai/transformers-js"
import {
  convertToModelMessages,
  createUIMessageStream,
  extractReasoningMiddleware,
  isStepCount,
  streamText,
  toUIMessageStream,
  wrapLanguageModel,
  type ChatRequestOptions,
  type ChatTransport,
  type UIMessageChunk,
} from "ai"

import { type ChatModel } from "@/lib/models"
import { getClientTools, type ChatUIMessage } from "@/tools"

const MAX_STEPS = 5

/**
 * Runs the chat on-device with Transformers.js (WebGPU where available).
 * The model weights are fetched from the Hugging Face Hub on first use and
 * cached by the browser, so the first message streams download progress.
 */
export class TransformersChatTransport implements ChatTransport<ChatUIMessage> {
  private readonly model: TransformersJSLanguageModel
  private readonly tools = getClientTools()
  private readonly enableThinking: boolean
  private readonly thinkingPrefilled: boolean

  constructor(config: ChatModel) {
    const {
      supportsWorker,
      enableThinking = false,
      thinkingPrefilled = false,
      ...loadOptions
    } = config.transformers ?? { supportsWorker: false }

    this.enableThinking = enableThinking
    this.thinkingPrefilled = thinkingPrefilled
    this.model = transformersJS(config.id, {
      ...loadOptions,
      worker: supportsWorker
        ? new Worker(new URL("./transformers-worker.ts", import.meta.url), {
            type: "module",
          })
        : undefined,
    })
  }

  async sendMessages(
    options: {
      chatId: string
      messages: ChatUIMessage[]
      abortSignal: AbortSignal | undefined
    } & {
      trigger: "submit-message" | "submit-tool-result" | "regenerate-message"
      messageId: string | undefined
    } & ChatRequestOptions
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { messages, abortSignal } = options
    const prompt = await convertToModelMessages(messages)
    const model = this.model

    return createUIMessageStream<ChatUIMessage>({
      execute: async ({ writer }) => {
        let downloadProgressId: string | undefined

        // Only report progress when the weights still have to be fetched.
        if ((await model.availability()) !== "available") {
          await model.createSessionWithProgress((progress) => {
            if (progress >= 1) return

            const percent = Math.round(progress * 100)
            downloadProgressId ??= `download-${Date.now()}`

            writer.write({
              type: "data-modelDownloadProgress",
              id: downloadProgressId,
              data: {
                status: "downloading",
                progress: percent,
                // The percentage is rendered from `progress` by the UI.
                message: "Downloading on-device model…",
              },
            })
          })

          if (downloadProgressId) {
            writer.write({
              type: "data-modelDownloadProgress",
              id: downloadProgressId,
              data: { status: "complete", progress: 100, message: "" },
            })
            downloadProgressId = undefined
          }
        }

        const result = streamText({
          model: wrapLanguageModel({
            model,
            middleware: extractReasoningMiddleware({
              tagName: "think",
              startWithReasoning: this.enableThinking && this.thinkingPrefilled,
            }),
          }),
          messages: prompt,
          tools: this.tools,
          stopWhen: isStepCount(MAX_STEPS),
          abortSignal,
          providerOptions: {
            "transformers-js": { enableThinking: this.enableThinking },
          },
        })

        writer.merge(
          toUIMessageStream({
            stream: result.stream,
            tools: this.tools,
            sendStart: false,
            onError: () => "Something went wrong. Please try again.",
          })
        )
      },
    })
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // On-device inference has no server stream to resume.
    return null
  }
}
