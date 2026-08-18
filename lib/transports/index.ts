"use client"

import {
  DefaultChatTransport,
  type ChatRequestOptions,
  type ChatTransport,
  type UIMessageChunk,
} from "ai"

import { type ChatUIMessage } from "@/tools"
import { getModel } from "@/lib/models"

import { TransformersChatTransport } from "./transformers-js"

type SendOptions = Parameters<ChatTransport<ChatUIMessage>["sendMessages"]>[0]

function modelIdOf(options: ChatRequestOptions) {
  const model = (options.body as { model?: unknown } | undefined)?.model
  return typeof model === "string" ? model : ""
}

/**
 * Routes each request to the transport that matches the requested model.
 * `useChat` keeps one transport for the lifetime of the chat, so the model is
 * taken from the per-request body that the UI already sends.
 */
export class RoutingChatTransport implements ChatTransport<ChatUIMessage> {
  private readonly server = new DefaultChatTransport<ChatUIMessage>({
    api: "/api/chat",
  })
  // One transport per Transformers.js model: each owns a loaded model and a
  // worker, so switching models must not throw that work away.
  private readonly transformers = new Map<string, TransformersChatTransport>()

  private forModel(modelId: string): ChatTransport<ChatUIMessage> {
    const model = getModel(modelId)

    if (model?.provider === "transformers-js") {
      let transport = this.transformers.get(model.id)
      if (!transport) {
        transport = new TransformersChatTransport(model)
        this.transformers.set(model.id, transport)
      }
      return transport
    }

    return this.server
  }

  sendMessages(options: SendOptions): Promise<ReadableStream<UIMessageChunk>> {
    return this.forModel(modelIdOf(options)).sendMessages(options)
  }

  reconnectToStream(
    options: { chatId: string } & ChatRequestOptions
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    return this.forModel(modelIdOf(options)).reconnectToStream(options)
  }
}
