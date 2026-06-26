import { useEffect, useState, useRef } from "react"
import { useRagStore, type UploadedFile } from "../store/rag-store"
import {
  useIndexInfo,
  useProjectFiles,
  useDeleteFile,
  useUploadFile,
  useChunksCount,
  useProcessFile,
  useProcessAndPush,
  usePushIndex,
  useProjects,
  useCreateProject,
  useDeleteProject,
} from "../hooks/use-rag"
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { Progress } from "@/shared/ui/progress"
import { Input } from "@/shared/ui/input"
import {
  DatabaseIcon,
  RefreshCwIcon,
  Loader2Icon,
  BinaryIcon,
  BoxesIcon,
  FileTextIcon,
  FolderOpenIcon,
  Clock3Icon,
  Trash2Icon,
  UploadIcon,
  CheckCircle2Icon,
  Settings2Icon,
  CpuIcon,
  SparklesIcon,
} from "lucide-react"

export function InfoPanel() {
  const {
    projectId,
    setProjectId,
    addUploadedFile,
    chunkSize,
    setChunkSize,
    overlapSize,
    setOverlapSize,
    doReset,
    setDoReset,
  } = useRagStore()
  const { data, isLoading, refetch } = useIndexInfo(projectId)
  const { data: filesData, isLoading: filesLoading, isError: filesIsError, refetch: refetchFiles } = useProjectFiles(projectId)
  const { data: chunksData, refetch: refetchChunks, isFetching: chunksFetching } = useChunksCount(projectId)
  const { data: projectsData, isLoading: projectsLoading } = useProjects()
  const deleteFileMutation = useDeleteFile(projectId)
  const processMutation = useProcessFile(projectId)
  const processAndPushMutation = useProcessAndPush(projectId)
  const pushIndexMutation = usePushIndex(projectId)
  const createProjectMutation = useCreateProject()
  const deleteProjectMutation = useDeleteProject()

  const projects = projectsData?.projects ?? []

  useEffect(() => {
    if (projects.length === 0) return
    const hasCurrentProject = projects.some((project) => project.project_id === projectId)
    if (!hasCurrentProject) {
      setProjectId(projects[0].project_id)
    }
  }, [projectId, projects, setProjectId])

  const [dragActive, setDragActive] = useState(false)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [ingestJobInfo, setIngestJobInfo] = useState<{ type: string; id: string } | null>(null)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useUploadFile(projectId)

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
      setUploadError(null)
      setUploadSuccess(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLocalFile(e.target.files[0])
      setUploadError(null)
      setUploadSuccess(null)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleUpload = () => {
    if (!localFile) return
    setUploadError(null)
    setUploadSuccess(null)

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
          setUploadSuccess("Document uploaded successfully! File ID: " + data.file_id)
          setLocalFile(null)
        } else {
          setUploadError(data.signal || "Upload failed")
        }
      },
      onError: (err: any) => {
        setUploadError(err.message || "Failed to upload file")
      },
    })
  }

  const handleDeleteFile = (fileId: number, fileName: string) => {
    const confirmed = window.confirm(
      `Delete "${fileName}"? This will permanently remove the file, its chunks, and associated vectors from the database and disk.`
    )
    if (!confirmed) return
    deleteFileMutation.mutate(fileId)
  }

  const handleRefresh = () => {
    refetch()
    refetchFiles()
    refetchChunks()
  }

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val)) {
      setProjectId(val)
    }
  }

  const handleCreateProject = () => {
    createProjectMutation.mutate(undefined, {
      onSuccess: (data) => {
        setProjectId(data.project.project_id)
      },
    })
  }

  const handleDeleteProject = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Project ${projectId}? This will permanently remove all files, chunks, embeddings, and the project record. This action cannot be undone.`
    )
    if (!confirmed) return

    deleteProjectMutation.mutate(projectId, {
      onSuccess: () => {
        const remaining = projects.filter((p) => p.project_id !== projectId)
        if (remaining.length > 0) {
          setProjectId(remaining[0].project_id)
        } else {
          handleCreateProject()
        }
      },
    })
  }

  const handleProcessOnly = () => {
    setIngestError(null)
    setIngestSuccess(null)
    setIngestJobInfo(null)

    processMutation.mutate(
      {
        chunk_size: chunkSize,
        overlap_size: overlapSize,
        do_reset: doReset ? 1 : 0,
      },
      {
        onSuccess: (data) => {
          setIngestSuccess(
            `Chunking complete! ${data.inserted_chunks} chunks created from ${data.processed_files} file(s).`
          )
        },
        onError: (err: any) => {
          setIngestError(err.message || "Processing failed")
        },
      }
    )
  }

  const handleProcessAndPush = () => {
    setIngestError(null)
    setIngestSuccess(null)
    setIngestJobInfo(null)

    processAndPushMutation.mutate(
      {
        chunk_size: chunkSize,
        overlap_size: overlapSize,
        do_reset: doReset ? 1 : 0,
      },
      {
        onSuccess: (data) => {
          if (data.workflow_task_id) {
            setIngestJobInfo({ type: "Complete Indexing Workflow Queued", id: data.workflow_task_id })
            setIngestSuccess("Full parsing, chunking, and vector indexing workflow started for all files!")
          } else {
            setIngestError(data.signal || "Failed to start workflow.")
          }
        },
        onError: (err: any) => {
          setIngestError(err.message || "Workflow failed")
        },
      }
    )
  }

  const handleIndexExisting = () => {
    setIngestError(null)
    setIngestSuccess(null)
    setIngestJobInfo(null)

    pushIndexMutation.mutate(
      {
        do_reset: doReset ? 1 : 0,
      },
      {
        onSuccess: (data) => {
          setIngestSuccess(
            `Indexing complete! ${data.inserted_items_count} chunk(s) pushed to the vector database.`
          )
        },
        onError: (err: any) => {
          setIngestError(err.message || "Indexing failed")
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

  const collection = data?.collection_info
  const files = filesData?.files ?? []
  const fileCount = filesData?.file_count ?? 0
  const pointsCount = collection?.record_count ?? 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border pb-4 bg-card shrink-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-md flex items-center gap-2">
                <DatabaseIcon className="size-4 text-primary" />
                Project Dashboard
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="projectId" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Active Project ID:
              </label>
              <select
                id="projectId"
                value={projectId}
                onChange={handleProjectChange}
                disabled={projectsLoading || projects.length === 0}
                className="h-9 min-w-[9rem] rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {projects.length === 0 ? (
                  <option value={projectId}>No projects available</option>
                ) : null}
                {projects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    Project {project.project_id}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending}
                className="h-9"
              >
                {createProjectMutation.isPending ? "Creating..." : "New Project"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteProject}
                disabled={deleteProjectMutation.isPending || projects.length === 0}
                className="h-9 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
              >
                {deleteProjectMutation.isPending ? (
                  "Deleting..."
                ) : (
                  <>
                    <Trash2Icon className="size-3.5 mr-1" />
                    Delete
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || filesLoading || chunksFetching}
                className="h-9"
              >
                {isLoading || filesLoading ? (
                  <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCwIcon className="size-3.5 mr-1.5" />
                )}
                Refresh dashboard
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Files in Active Project Card */}
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FolderOpenIcon className="size-4 text-primary" />
                    Asset records stored for project {projectId}
                  </h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {fileCount} total
                </Badge>
              </div>

              {filesIsError ? (
                <div className="p-4 text-sm text-red-700">Unable to load files for this project.</div>
              ) : filesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                  <Loader2Icon className="size-6 animate-spin text-primary" />
                  <span className="text-sm">Loading project files...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground px-4">
                  <FolderOpenIcon className="size-10 text-muted-foreground/40" />
                  <span className="text-sm font-semibold">No files in this project yet</span>
                  <p className="text-xs max-w-md leading-relaxed">
                    Upload files into the active project and they will appear here with their database record, size, and timestamps.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 overflow-auto">
                  <ul className="divide-y divide-border">
                    {files.map((file) => (
                      <li key={file.file_id} className="px-4 py-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileTextIcon className="size-4 text-primary shrink-0" />
                            <span className="font-medium text-foreground truncate">{file.file_name}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                            <span className="flex items-center gap-1">
                              <Clock3Icon className="size-3.5" />
                              {new Date(file.created_at || file.updated_at || "").toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="self-start sm:self-center text-xs">
                            ID {file.file_id}
                          </Badge>
                          <button
                            onClick={() => handleDeleteFile(file.file_id, file.file_name)}
                            disabled={deleteFileMutation.isPending}
                            className="flex items-center justify-center size-7 rounded-md border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 transition-colors cursor-pointer"
                            title={`Delete ${file.file_name}`}
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Upload Section */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <UploadIcon className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Upload a document</span>
              </div>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
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
                <div className="flex items-center justify-center size-10 rounded-full bg-muted/60 text-muted-foreground mb-2">
                  <UploadIcon className="size-5" />
                </div>
                {localFile ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      Selected: {localFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Ready to upload · {formatBytes(localFile.size)}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      Drag & drop file here or click to browse
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Supports TXT, PDF.
                    </span>
                  </div>
                )}
              </div>

              {uploadMutation.isPending && (
                <div className="flex flex-col gap-1 mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-primary">Uploading file to server...</span>
                  </div>
                  <Progress value={85} className="h-1.5" />
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs text-red-800 mt-3">
                  <span className="font-semibold text-red-900 shrink-0">Error:</span>
                  <p>{uploadError}</p>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-green-100 bg-green-50/40 text-xs text-green-800 mt-3">
                  <CheckCircle2Icon className="size-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 mb-0.5">Success</p>
                    <p className="text-[11px] text-green-800">{uploadSuccess}</p>
                  </div>
                </div>
              )}

              {localFile && (
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleUpload} disabled={uploadMutation.isPending} size="sm">
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
              )}
            </div>
          </div>

          {/* RAG Configuration */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Settings2Icon className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">RAG Configuration</span>
              </div>
              <div className="flex flex-col gap-4">
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
              </div>
            </div>

            {/* Process & Index */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CpuIcon className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Process & Index Documents</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Trigger backend processing workers to chunk, index, and vectorize documents in the active project.
              </p>

              {ingestError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs text-red-800 mb-3">
                  <span className="font-semibold text-red-900 shrink-0">Error:</span>
                  <p>{ingestError}</p>
                </div>
              )}

              {ingestSuccess && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-green-100 bg-green-50/40 text-xs text-green-800 mb-3">
                  <CheckCircle2Icon className="size-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 mb-0.5">Success</p>
                    <p className="text-[11px] text-green-800">{ingestSuccess}</p>
                  </div>
                </div>
              )}

              {ingestJobInfo && (
                <div className="flex flex-col gap-2 p-3.5 rounded-lg border border-primary/10 bg-primary/5 text-xs mb-3">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <CpuIcon className="size-4" />
                    {ingestJobInfo.type}
                  </div>
                  <div className="flex flex-col gap-1 mt-1 text-muted-foreground">
                    <span>Celery Worker Job ID (Queued):</span>
                    <code className="bg-background border border-border p-1.5 rounded text-[10px] break-all select-all font-mono">
                      {ingestJobInfo.id}
                    </code>
                  </div>
                  <span className="text-[9px] text-muted-foreground/80 mt-1 leading-relaxed">
                    Notice: Backend execution runs asynchronously. You can search or run queries once the worker finishes chunking and indexing.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
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
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DatabaseIcon className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide">Project</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">#{projectId}</div>
              <p className="mt-1 text-xs text-muted-foreground">Current active project used by all ingest and query actions.</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileTextIcon className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide">Files</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">{fileCount}</div>
              <p className="mt-1 text-xs text-muted-foreground">Files currently stored inside the active project.</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BoxesIcon className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide">Chunks</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">{chunksData?.chunks_count ?? 0}</div>
              <p className="mt-1 text-xs text-muted-foreground">Total chunks stored in the database for this project.</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BinaryIcon className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide">VECTORS</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">{pointsCount}</div>
              <p className="mt-1 text-xs text-muted-foreground">Vectors pushed to the index backend for semantic search.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
