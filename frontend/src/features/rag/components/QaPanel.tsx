import { useState, useRef, useEffect } from "react"
import { useRagStore } from "../store/rag-store"
import { useAnswerRag } from "../hooks/use-rag"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import {
  SendIcon,
  MessageSquareIcon,
  Trash2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  Code2Icon,
  UserIcon,
  BotIcon,
  Loader2Icon,
  Settings2Icon,
} from "lucide-react"

const DISTANCE_METRICS = [
  { value: "cosine", label: "Cosine" },
  { value: "l2", label: "L2" },
  { value: "inner_product", label: "Inner Product" },
] as const

export function QaPanel() {
  const { projectId, chatHistory, addChatMessage, clearChatHistory } = useRagStore()
  const [input, setInput] = useState("")
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null)
  const [distanceMetric, setDistanceMetric] = useState("cosine")
  const [minScore, setMinScore] = useState("")
  const [showConfig, setShowConfig] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const answerMutation = useAnswerRag(projectId)

  // Scroll to bottom when chat history changes or is loading
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, answerMutation.isPending])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || answerMutation.isPending) return

    const question = input.trim()
    setInput("")

    // 1. Add user message
    addChatMessage({
      role: "user",
      content: question,
    })

    // 2. Query RAG backend
    answerMutation.mutate(
      {
        text: question,
        limit: 5,
        distance_metric: distanceMetric,
        min_score: minScore ? parseFloat(minScore) : undefined,
      },
      {
        onSuccess: (data) => {
          if (data.signal === "rag_answer_success") {
            addChatMessage({
              role: "assistant",
              content: data.answer,
              fullPrompt: data.full_prompt,
            })
          } else {
            addChatMessage({
              role: "assistant",
              content: `Error generating answer: Backend returned signal "${data.signal}"`,
            })
          }
        },
        onError: (err: any) => {
          addChatMessage({
            role: "assistant",
            content: `Failed to connect to backend: ${err.message || "Unknown error occurred"}`,
          })
        },
      }
    )
  }

  const togglePromptExpansion = (msgId: string) => {
    if (expandedPromptId === msgId) {
      setExpandedPromptId(null)
    } else {
      setExpandedPromptId(msgId)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto p-4 md:p-6 gap-4">
      <Card className="flex flex-col flex-1 shadow-sm overflow-hidden h-full">
        {/* Card Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3 bg-card shrink-0">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-md flex items-center gap-2">
              <MessageSquareIcon className="size-4 text-primary" />
              Augmented Chat QA
            </CardTitle>
            <CardDescription className="text-xs">
              Interact with the vector-indexed context via generative LLM completions.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChatHistory}
            className="text-muted-foreground hover:text-destructive h-8"
          >
            <Trash2Icon className="size-3.5 mr-1.5" />
            Reset Chat
          </Button>
        </CardHeader>

        {/* Conversation Feed */}
        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-muted/10">
          <div className="flex flex-col gap-4">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm max-w-[85%] ${
                  msg.role === "user"
                    ? "ml-auto flex-row-reverse"
                    : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex items-center justify-center size-8 rounded-full border shrink-0 ${
                    msg.role === "user"
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {msg.role === "user" ? (
                    <UserIcon className="size-4" />
                  ) : (
                    <BotIcon className="size-4" />
                  )}
                </div>

                {/* Message Body */}
                <div className="flex flex-col gap-2">
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card text-foreground border border-border rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Developer Assembled Prompt View */}
                  {msg.role === "assistant" && msg.fullPrompt && (
                    <div className="flex flex-col self-start">
                      <button
                        onClick={() => togglePromptExpansion(msg.id)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <Code2Icon className="size-3" />
                        {expandedPromptId === msg.id ? "Hide System Prompt" : "Show System Prompt"}
                        {expandedPromptId === msg.id ? (
                          <ChevronUpIcon className="size-3" />
                        ) : (
                          <ChevronDownIcon className="size-3" />
                        )}
                      </button>

                      {expandedPromptId === msg.id && (
                        <div className="mt-1.5 p-3 rounded-lg border border-border bg-muted/60 text-[10px] leading-relaxed max-w-full overflow-x-auto font-mono text-muted-foreground select-all whitespace-pre-wrap">
                          <span className="font-semibold text-foreground block border-b border-border/60 pb-1 mb-1.5">
                            Assembled LLM prompt (system instruction + retrieved contexts + user query):
                          </span>
                          {msg.fullPrompt}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Waiting State Spinner */}
            {answerMutation.isPending && (
              <div className="flex gap-3 text-sm max-w-[85%] mr-auto">
                <div className="flex items-center justify-center size-8 rounded-full border bg-muted border-border text-muted-foreground shrink-0">
                  <BotIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="rounded-2xl px-4 py-2.5 bg-card text-foreground border border-border rounded-tl-none flex items-center gap-2">
                    <Loader2Icon className="size-4 animate-spin text-primary" />
                    <span className="text-muted-foreground">Thinking... searching vector context...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        {/* Message Input Footer */}
        <CardFooter className="p-4 border-t border-border bg-card shrink-0">
          <form onSubmit={handleSend} className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 w-full">
              <Input
                type="text"
                placeholder="Type your question about the indexed document context..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={answerMutation.isPending}
                className="flex-1 h-10"
                autoFocus
              />
              <Button
                type="submit"
                size="default"
                disabled={!input.trim() || answerMutation.isPending}
                className="h-10 shrink-0"
              >
                <SendIcon data-icon="inline-start" />
                Ask RAG
              </Button>
            </div>

            {/* Toggle config row */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <Settings2Icon className="size-3" />
                Vector search settings
              </button>

              {showConfig && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="qa-distance-metric" className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                      Distance:
                    </label>
                    <select
                      id="qa-distance-metric"
                      value={distanceMetric}
                      onChange={(e) => setDistanceMetric(e.target.value)}
                      disabled={answerMutation.isPending}
                      className="h-7 rounded-md border border-input bg-background px-1.5 text-[10px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    >
                      {DISTANCE_METRICS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {distanceMetric === "cosine" && (
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="qa-min-score" className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                        Min score:
                      </label>
                      <Input
                        id="qa-min-score"
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={minScore}
                        onChange={(e) => setMinScore(e.target.value)}
                        placeholder="0.0"
                        className="w-16 h-7 text-[10px]"
                        disabled={answerMutation.isPending}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
