import { useState } from "react"
import { useRagStore } from "../store/rag-store"
import {
  useProcessFile,
  useProcessAndPush,
  usePushIndex,
} from "../hooks/use-rag"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import {
  Settings2Icon,
  CpuIcon,
  SparklesIcon,
  CheckCircle2Icon,
  DatabaseIcon,
} from "lucide-react"

export function IngestPanel() {
  const {
    projectId,
    chunkSize,
    setChunkSize,
    overlapSize,
    setOverlapSize,
    doReset,
    setDoReset,
  } = useRagStore()

  const [jobInfo, setJobInfo] = useState<{ type: string; id: string } | null>(null)
  const [errorMsg, setErrorData] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Hooks
  const processMutation = useProcessFile(projectId)
  const processAndPushMutation = useProcessAndPush(projectId)
  const pushIndexMutation = usePushIndex(projectId)

  // Action: Process (Chunk Only) — processes all project files
  const handleProcessOnly = () => {
    setErrorData(null)
    setSuccessMsg(null)
    setJobInfo(null)

    processMutation.mutate(
      {
        chunk_size: chunkSize,
        overlap_size: overlapSize,
        do_reset: doReset ? 1 : 0,
      },
      {
        onSuccess: (data) => {
          if (data.task_id) {
            setJobInfo({ type: "All Files Chunking Job Queued", id: data.task_id })
            setSuccessMsg("Chunking task for all project files started in backend! Celery Task ID returned.")
          } else {
            setErrorData(data.signal || "Failed to start chunking job.")
          }
        },
        onError: (err: any) => {
          setErrorData(err.message || "Processing failed")
        },
      }
    )
  }

  // Action: Process and Push (Combined Workflow) — processes all project files
  const handleProcessAndPush = () => {
    setErrorData(null)
    setSuccessMsg(null)
    setJobInfo(null)

    processAndPushMutation.mutate(
      {
        chunk_size: chunkSize,
        overlap_size: overlapSize,
        do_reset: doReset ? 1 : 0,
      },
      {
        onSuccess: (data) => {
          if (data.workflow_task_id) {
            setJobInfo({ type: "Complete Indexing Workflow Queued", id: data.workflow_task_id })
            setSuccessMsg("Full parsing, chunking, and vector indexing workflow started for all files!")
          } else {
            setErrorData(data.signal || "Failed to start workflow.")
          }
        },
        onError: (err: any) => {
          setErrorData(err.message || "Workflow failed")
        },
      }
    )
  }

  // Action: Index Existing Chunks
  const handleIndexExisting = () => {
    setErrorData(null)
    setSuccessMsg(null)
    setJobInfo(null)

    pushIndexMutation.mutate(
      {
        do_reset: doReset ? 1 : 0,
      },
      {
        onSuccess: (data) => {
          if (data.task_id) {
            setJobInfo({ type: "Vector DB Indexing Job Queued", id: data.task_id })
            setSuccessMsg("Pushed existing chunks to Vector Database!")
          } else {
            setErrorData(data.signal || "Failed to queue indexing job.")
          }
        },
        onError: (err: any) => {
          setErrorData(err.message || "Indexing failed")
        },
      }
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hyperparameters Config */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-md flex items-center gap-2">
              <Settings2Icon className="size-4 text-primary" />
              RAG Configuration
            </CardTitle>
            <CardDescription>
              Adjust chunk boundaries and indexing reset flags.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            {/* Chunk Size */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="chunkSize" className="text-xs font-semibold text-foreground">
                Chunk Size (characters)
              </label>
              <Input
                id="chunkSize"
                type="number"
                min={1}
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value, 10) || 100)}
                className="h-9"
              />
              <span className="text-[10px] text-muted-foreground">
                Splits text into intervals of this length.
              </span>
            </div>

            {/* Overlap Size */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="overlapSize" className="text-xs font-semibold text-foreground">
                Overlap Size (characters)
              </label>
              <Input
                id="overlapSize"
                type="number"
                min={0}
                value={overlapSize}
                onChange={(e) => setOverlapSize(parseInt(e.target.value, 10) || 0)}
                className="h-9"
              />
              <span className="text-[10px] text-muted-foreground">
                Retains context from the previous chunk.
              </span>
            </div>

            {/* Reset Vector DB Collection */}
            <div className="flex items-center gap-2.5 pt-2">
              <input
                id="doReset"
                type="checkbox"
                checked={doReset}
                onChange={(e) => setDoReset(e.target.checked)}
                className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex flex-col">
                <label htmlFor="doReset" className="text-xs font-semibold text-foreground cursor-pointer">
                  Reset Vector Index
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Clear prior embeddings before writing new ones.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Action Panel */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-md flex items-center gap-2">
              <CpuIcon className="size-4 text-primary" />
              Process & Index Documents
            </CardTitle>
            <CardDescription>
              Trigger backend processing workers to chunk, index, and vectorize documents in the active project.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-5">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs text-red-800">
                <span className="font-semibold text-red-900 shrink-0">Error:</span>
                <p>{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-green-100 bg-green-50/40 text-xs text-green-800">
                <CheckCircle2Icon className="size-4 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 mb-0.5">Success</p>
                  <p className="text-[11px] text-green-800">{successMsg}</p>
                </div>
              </div>
            )}

            {jobInfo && (
              <div className="flex flex-col gap-2 p-3.5 rounded-lg border border-primary/10 bg-primary/5 text-xs">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CpuIcon className="size-4" />
                  {jobInfo.type}
                </div>
                <div className="flex flex-col gap-1 mt-1 text-muted-foreground">
                  <span>Celery Worker Job ID (Queued):</span>
                  <code className="bg-background border border-border p-1.5 rounded text-[10px] break-all select-all font-mono">
                    {jobInfo.id}
                  </code>
                </div>
                <span className="text-[9px] text-muted-foreground/80 mt-1 leading-relaxed">
                  Notice: Backend execution runs asynchronously. You can search or run queries once the worker finishes chunking and indexing.
                </span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 bg-muted/20">

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleIndexExisting}
                disabled={
                  processMutation.isPending ||
                  processAndPushMutation.isPending ||
                  pushIndexMutation.isPending
                }
                size="sm"
              >
                <DatabaseIcon className="size-4 mr-1.5" />
                Index Existing Chunks
              </Button>

              <Button
                variant="outline"
                onClick={handleProcessOnly}
                disabled={
                  processMutation.isPending ||
                  processAndPushMutation.isPending ||
                  pushIndexMutation.isPending
                }
                size="sm"
              >
                <CpuIcon className="size-4 mr-1.5" />
                Chunk All Files
              </Button>

              <Button
                onClick={handleProcessAndPush}
                disabled={
                  processMutation.isPending ||
                  processAndPushMutation.isPending ||
                  pushIndexMutation.isPending
                }
                size="sm"
              >
                <SparklesIcon data-icon="inline-start" />
                Process & Index All (Workflow)
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
