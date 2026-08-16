"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { doesBrowserSupportTransformersJS } from "@browser-ai/transformers-js"
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai"
import { type ChatModel } from "@/lib/models"
import { RoutingChatTransport } from "@/lib/transports"
import { type ChatUIMessage } from "@/tools"
import { ChatMessage } from "@/components/chat-message"
import { PromptForm } from "@/components/prompt-form"
import { QuestionCard } from "@/components/question-card"
import { Suggestions } from "@/components/suggestions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

const noopSubscribe = () => () => {}
const notSupportedOnServer = () => false

/** Reads a browser capability without breaking hydration. */
function useBrowserSupport(check: () => boolean) {
  return React.useSyncExternalStore(noopSubscribe, check, notSupportedOnServer)
}

export function Chat({ models }: { models: ChatModel[] }) {
  const [model, setModel] = React.useState(models[0]?.id ?? "")

  // On-device models need WebGPU. The server snapshot is `false` so the first
  // client render matches the markup.
  const supportsTransformers = useBrowserSupport(
    doesBrowserSupportTransformersJS
  )

  const availableModels = React.useMemo(
    () =>
      models.filter(
        (m) => m.provider !== "transformers-js" || supportsTransformers
      ),
    [models, supportsTransformers]
  )

  const resolvedModel = availableModels.some((m) => m.id === model)
    ? model
    : (availableModels[0]?.id ?? "")

  // One transport for the whole chat; it dispatches per request based on the
  // model id that every send already carries in its body.
  const [transport] = React.useState(() => new RoutingChatTransport())

  const { messages, sendMessage, status, stop, error, addToolOutput } =
    useChat<ChatUIMessage>({
      transport,
      // Resume the conversation automatically once the user has answered the
      // ask_user questionnaire.
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    })

  const isBusy = status === "submitted" || status === "streaming"

  const lastMessage = messages.at(-1)
  const pendingQuestion =
    lastMessage?.role === "assistant"
      ? lastMessage.parts.find(
          (part): part is Extract<typeof part, { type: "tool-ask_user" }> =>
            part.type === "tool-ask_user" &&
            (part.state === "input-streaming" ||
              part.state === "input-available")
        )
      : undefined

  return (
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>What can I help with?</EmptyTitle>
              <EmptyDescription>
                Pick a model and start chatting. Responses stream through the
                Vercel AI Gateway.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Suggestions
                onSelect={(prompt) =>
                  sendMessage(
                    { text: prompt },
                    { body: { model: resolvedModel } }
                  )
                }
              />
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <MessageScrollerProvider>
          <MessageScroller className="flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-6">
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <ChatMessage
                      message={message}
                      isStreaming={isBusy && message.id === lastMessage?.id}
                    />
                  </MessageScrollerItem>
                ))}
                {status === "submitted" && (
                  <MessageScrollerItem messageId="thinking">
                    <div className="flex shimmer items-center gap-2 px-3 text-sm text-muted-foreground">
                      Thinking…
                    </div>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
              {pendingQuestion && (
                <QuestionCard
                  part={pendingQuestion}
                  onAnswer={(toolCallId, answer) =>
                    addToolOutput({
                      tool: "ask_user",
                      toolCallId,
                      output: answer,
                      options: { body: { model: resolvedModel } },
                    })
                  }
                />
              )}
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 pb-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <PromptForm
          models={availableModels}
          model={resolvedModel}
          onModelChange={setModel}
          isBusy={isBusy}
          onSubmit={(text) =>
            sendMessage({ text }, { body: { model: resolvedModel } })
          }
          onStop={() => stop()}
        />
      </div>
    </div>
  )
}
