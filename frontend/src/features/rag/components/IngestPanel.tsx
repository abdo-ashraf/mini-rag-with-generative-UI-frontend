import { useState, useRef } from "react"
import { useRagStore, type UploadedFile } from "../store/rag-store"
import {
  useUploadFile,
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
import { Badge } from "@/shared/ui/badge"
import { Progress } from "@/shared/ui/progress"
import {
  UploadIcon,
  Settings2Icon,
  CpuIcon,
  FileTextIcon,
  SparklesIcon,
  CheckCircle2Icon,
  InfoIcon,
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
    activeFileId,
    setActiveFileId,
    uploadedFiles,
    addUploadedFile,
  } = useRagStore()

  const [dragActive, setDragActive] = useState(false)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [jobInfo, setJobInfo] = useState<{ type: string; id: string } | null>(null)
  const [errorMsg, setErrorData] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const uploadMutation = useUploadFile(projectId)
  const processMutation = useProcessFile(projectId)
  const processAndPushMutation = useProcessAndPush(projectId)
  const pushIndexMutation = usePushIndex(projectId)

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setLocalFile(e.dataTransfer.files[0])
      setErrorData(null)
      setSuccessMsg(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLocalFile(e.target.files[0])
      setErrorData(null)
      setSuccessMsg(null)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Action: Upload
  const handleUpload = () => {
    if (!localFile) return
    setErrorData(null)
    setSuccessMsg(null)
    setJobInfo(null)

    uploadMutation.mutate(localFile, {
      onSuccess: (data) => {
        if (data.signal === "file_upload_success" && data.file_id) {
          const newFile: UploadedFile = {
            id: data.file_id,
            name: localFile.name,
            size: localFile.size,
            uploadedAt: new Date().toLocaleTimeString(),
          };
          addUploadedFile(newFile)
          setSuccessMsg("Document uploaded successfully! File ID: " + data.file_id)
          setLocalFile(null)
        } else {
          setErrorData(data.signal || "Upload failed")
        }
      },
      onError: (err: any) => {
        setErrorData(err.message || "Failed to upload file")
      },
    })
  }

  // Action: Process (Chunk Only)
  const handleProcessOnly = () => {
    if (!activeFileId) return
    setErrorData(null)
    setSuccessMsg(null)
    setJobInfo(null)

    processMutation.mutate(
      {
        file_id: activeFileId,
        chunk_size: chunkSize,
        overlap_size: overlapSize,
        do_reset: doReset ? 1 : 0,
      },
      {
        onSuccess: (data) => {
          if (data.task_id) {
            setJobInfo({ type: "File Chunking Job Queued", id: data.task_id })
            setSuccessMsg("Document chunking task started in backend! Celery Task ID returned.")
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

  // Action: Process and Push (Combined Workflow)
  const handleProcessAndPush = () => {
    if (!activeFileId) return
    setErrorData(null)
    setSuccessMsg(null)
    setJobInfo(null)

    processAndPushMutation.mutate(
      {
        file_id: activeFileId,
        chunk_size: chunkSize,
        overlap_size: overlapSize,
        do_reset: doReset ? 1 : 0,
      },
      {
        onSuccess: (data) => {
          if (data.workflow_task_id) {
            setJobInfo({ type: "Complete Indexing Workflow Queued", id: data.workflow_task_id })
            setSuccessMsg("Full parsing, chunking, and vector indexing workflow started!")
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

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
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

        {/* Uploads History */}
        <Card className="shadow-sm flex-1">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-md flex items-center gap-2">
              <FileTextIcon className="size-4 text-primary" />
              Document Logs
            </CardTitle>
            <CardDescription>
              Recently uploaded files in this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
            {uploadedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-1">
                <InfoIcon className="size-5 text-muted-foreground/50" />
                <span className="text-xs">No documents uploaded yet.</span>
              </div>
            ) : (
              uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    activeFileId === file.id
                      ? "bg-primary/5 border-primary"
                      : "bg-background border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-2 truncate">
                    <FileTextIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex flex-col truncate gap-0.5">
                      <span className="font-semibold text-foreground truncate">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ID: {file.id} · {formatBytes(file.size)}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[9px] px-1 py-0 h-4">
                    {file.uploadedAt}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Action Panel */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-md flex items-center gap-2">
              <UploadIcon className="size-4 text-primary" />
              Upload & Index Documents
            </CardTitle>
            <CardDescription>
              Load files into the project space and trigger backend processing workers.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-5">
            {/* File Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : localFile
                  ? "border-green-400 bg-green-50/20"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.pdf,.md,.docx,.json"
              />

              <div className="flex items-center justify-center size-12 rounded-full bg-muted/60 text-muted-foreground mb-3">
                <UploadIcon className="size-6" />
              </div>

              {localFile ? (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    Selected: {localFile.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Ready to upload · {formatBytes(localFile.size)}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    Drag & drop file here or click to browse
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Supports TXT, PDF, MD, DOCX, JSON · Max 10MB
                  </span>
                </div>
              )}
            </div>

            {/* Action feedbacks */}
            {uploadMutation.isPending && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-primary">Uploading file to server...</span>
                </div>
                <Progress value={85} className="h-1.5" />
              </div>
            )}

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
            {localFile ? (
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  size="sm"
                >
                  <UploadIcon data-icon="inline-start" />
                  Upload Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocalFile(null)}
                  disabled={uploadMutation.isPending}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                {activeFileId
                  ? `Selected File ID: ${activeFileId}`
                  : "No active file selected. Choose one above."}
              </span>
            )}

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
                  !activeFileId ||
                  processMutation.isPending ||
                  processAndPushMutation.isPending ||
                  pushIndexMutation.isPending
                }
                size="sm"
              >
                <CpuIcon className="size-4 mr-1.5" />
                Chunk Only
              </Button>

              <Button
                onClick={handleProcessAndPush}
                disabled={
                  !activeFileId ||
                  processMutation.isPending ||
                  processAndPushMutation.isPending ||
                  pushIndexMutation.isPending
                }
                size="sm"
              >
                <SparklesIcon data-icon="inline-start" />
                Process & Index (Workflow)
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
