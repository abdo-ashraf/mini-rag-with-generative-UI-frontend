import { useRagStore } from "../store/rag-store"
import { useIndexInfo, useProjectFiles } from "../hooks/use-rag"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import {
  DatabaseIcon,
  RefreshCwIcon,
  Loader2Icon,
  TagIcon,
  BinaryIcon,
  BoxesIcon,
  AlertTriangleIcon,
  FileTextIcon,
  FolderOpenIcon,
  Clock3Icon,
} from "lucide-react"

export function InfoPanel() {
  const { projectId } = useRagStore()
  const { data, isLoading, isError, refetch } = useIndexInfo(projectId)
  const { data: filesData, isLoading: filesLoading, isError: filesIsError, refetch: refetchFiles } = useProjectFiles(projectId)

  const handleRefresh = () => {
    refetch()
    refetchFiles()
  }

  const collection = data?.collection_info
  const files = filesData?.files ?? []
  const fileCount = filesData?.file_count ?? 0
  const pointsCount = collection?.points_count ?? collection?.vectors_count ?? 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border pb-4 bg-card shrink-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-md flex items-center gap-2">
                <DatabaseIcon className="size-4 text-primary" />
                Diagnostics dashboard
              </CardTitle>
              <CardDescription>
                Active project {projectId} with vector index state and stored files surfaced side by side.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || filesLoading}
              className="h-9"
            >
              {isLoading || filesLoading ? (
                <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCwIcon className="size-3.5 mr-1.5" />
              )}
              Refresh diagnostics
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
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
                <TagIcon className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide">Collection</span>
              </div>
              <div className="mt-2 text-lg font-bold text-foreground break-all">
                {collection?.name || `collection_project_${projectId}`}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Vector namespace associated with the active project.</p>
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
                <BinaryIcon className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide">Indexed chunks</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">{pointsCount}</div>
              <p className="mt-1 text-xs text-muted-foreground">Chunk or vector count returned by the index backend.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground rounded-xl border border-dashed border-border bg-muted/20">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading diagnostics for project {projectId}...</span>
            </div>
          ) : isError ? (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-100 bg-red-50/60 text-sm text-red-800">
              <AlertTriangleIcon className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-red-900">Index information unavailable</span>
                <p className="text-xs leading-relaxed">
                  This project does not have a ready vector collection yet. Upload a document, then run processing and indexing to populate the dashboard.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <BoxesIcon className="size-4 text-primary" />
                      Collection status
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Visible state from the vector backend for this project.</p>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-600 text-white font-semibold text-xs py-0.5">
                    Ready
                  </Badge>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Namespace</div>
                    <div className="mt-1 text-sm font-medium text-foreground break-all">
                      {collection?.name || `collection_project_${projectId}`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Points</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{collection?.points_count ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Vectors</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{collection?.vectors_count ?? 0}</div>
                  </div>
                </div>
                <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed">
                  The collection becomes visible after processing and indexing at least one file for the active project.
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FolderOpenIcon className="size-4 text-primary" />
                      Files in active project
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Asset records stored in the database for project {projectId}.</p>
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
                  <div className="max-h-[28rem] overflow-auto">
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
                          <Badge variant="outline" className="self-start sm:self-center text-xs">
                            ID {file.file_id}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="py-3.5 px-6 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between text-[10px] text-muted-foreground gap-2">
          <span>Project files are loaded from the active project's database assets.</span>
          <span>Refresh to sync the latest collection and file state.</span>
        </CardFooter>
      </Card>
    </div>
  )
}
