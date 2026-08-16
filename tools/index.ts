import { type InferUITools, type UIMessage } from "ai"

import { askUser } from "./ask_user"
import { githubRepo } from "./github_repo"
import { getWebSearch } from "./web_search"

const baseTools = {
  github_repo: githubRepo,
  ask_user: askUser,
}

export function getTools(modelId: string) {
  const webSearch = getWebSearch(modelId)
  return webSearch ? { ...baseTools, web_search: webSearch } : baseTools
}

// Tools that can run entirely in the browser (no server-side provider tools).
export function getClientTools() {
  return baseTools
}

export type ChatDataTypes = {
  // Emitted by the on-device transports while a model is being downloaded.
  modelDownloadProgress: {
    status: "downloading" | "complete" | "error"
    progress?: number
    message: string
  }
}

export type ChatUIMessage = UIMessage<
  unknown,
  ChatDataTypes,
  InferUITools<typeof baseTools> & {
    web_search: {
      input: { query?: string }
      output: unknown
    }
  }
>

export type ChatMessagePart = ChatUIMessage["parts"][number]

export type TextMessagePart = Extract<ChatMessagePart, { type: "text" }>

export type ReasoningMessagePart = Extract<
  ChatMessagePart,
  { type: "reasoning" }
>

export type SourceUrlPart = Extract<ChatMessagePart, { type: "source-url" }>

export type GithubRepoToolPart = Extract<
  ChatMessagePart,
  { type: "tool-github_repo" }
>

export type AskUserToolPart = Extract<
  ChatMessagePart,
  { type: "tool-ask_user" }
>

export type WebSearchToolPart = Extract<
  ChatMessagePart,
  { type: "tool-web_search" }
>

export type ModelDownloadProgressPart = Extract<
  ChatMessagePart,
  { type: "data-modelDownloadProgress" }
>
