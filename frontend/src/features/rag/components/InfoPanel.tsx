import { useState, useRef } from "react"
import { useRagStore, type UploadedFile } from "../store/rag-store"
import { useIndexInfo, useProjectFiles, useDeleteFile, useUploadFile, useChunksCount } from "../hooks/use-rag"
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { Progress } from "@/shared/ui/progress"
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
} from "lucide-react"

export function InfoPanel() {
  const { projectId, addUploadedFile } = useRagStore()
  const { data, isLoading, refetch } = useIndexInfo(projectId)
  const { data: filesData, isLoading: filesLoading, isError: filesIsError, refetch: refetchFiles } = useProjectFiles(projectId)
  const { data: chunksData, refetch: refetchChunks, isFetching: chunksFetching } = useChunksCount(projectId)
  const deleteFileMutation = useDeleteFile(projectId)

  const [dragActive, setDragActive] = useState(false)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
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
